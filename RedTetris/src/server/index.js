// src/server/index.js

import express from "express";
import http from "http";
import * as redis from "redis";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import createGame from "./Models/Game.js";
import createSoloGame from "./Models/SoloGame.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

const client = redis.createClient();

client.on("connect", () => {
  console.log("Connected to Redis");
});

client.on("error", (err) => {
  console.error("Redis connection error:", err);
});

app.use(express.json());

const buildPath = path.resolve(__dirname, "../client/red-tetris/build");
app.use(express.static(buildPath));

const games = {}; // Déclaration de `games`

app.get("/score/:userId", async (req, res) => {
  const userId = req.params.userId;
  client.get(`score:${userId}`, (err, score) => {
    if (err) return res.status(500).send(err);
    res.json({ score: score || 0 });
  });
});

app.post("/score/:userId", (req, res) => {
  const userId = req.params.userId;
  const { score } = req.body;
  client.set(`score:${userId}`, score, (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Score updated" });
  });
});

const generateRoomName = () => {
  let roomNumber = 0;
  while (games[`Room_${roomNumber}`]) {
    roomNumber++;
  }
  return `Room_${roomNumber}`;
};

// Gestion des rooms disponibles
app.get("/rooms", (req, res) => {
  // Maintenir 3 rooms disponibles
  while (
    Object.keys(games).filter(
      (room) => !games[room].isStarted && games[room].mode === "multiplayer"
    ).length < 3
  ) {
    const roomName = generateRoomName();
    games[roomName] = createGame(roomName);
  }

  const activeRooms = Object.keys(games)
    .filter((roomName) => games[roomName].mode === "multiplayer")
    .map((roomName) => ({
      roomName,
      players: Object.keys(games[roomName].players).length,
      isStarted: games[roomName].isStarted,
    }));

  res.json(
    activeRooms.filter((room) => room.roomName && room.roomName !== "null")
  );
});

// Route pour le mode solo
app.get("/solo", (req, res) => {
  try {
    const playerName = `Player_${Date.now()}`;
    const roomName = `Solo_${playerName}`;
    res.json({
      roomUrl: `http://localhost:3000/?room=${roomName}&playerName=${playerName}&mode=solo`,
      success: true,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la room solo :", error);
    res.status(500).json({ error: "Impossible de créer la room solo" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

function handleSoloMode(room, playerName, socket) {
  if (!games[room]) {
    games[room] = {
      ...createSoloGame(room, playerName, socket, io),
      mode: "solo",
    };
  }
  const game = games[room];
  socket.join(room);
  console.log(`${playerName} a rejoint la room solo ${room}`);

  game.startGame();

  socket.on("lineComplete", ({ lines }) => {
    game.handleLineCompletion(lines);
  });

  socket.on("gameOver", () => {
    game.handleGameOver();
  });

  socket.on("restartGame", () => {
    game.resetGame();
    game.startGame();
  });

  socket.on("disconnect", () => {
    delete games[room];
    console.log(`Jeu solo ${room} supprimé suite à la déconnexion.`);
  });
}

function handleMultiplayerMode(room, playerName, socket) {
  if (!games[room]) {
    games[room] = { ...createGame(room, io), mode: "multiplayer" };
  }
  const game = games[room];

  if (game.isStarted) {
    socket.emit("errorMessage", "La partie a déjà commencé.");
    socket.emit("gameStarted", { pieces: game.pieceSequence });
    return;
  }
  console.log(`Room actuelle : ${room}`);
  console.log(`Joueurs dans la room avant ajout :`, Object.keys(game.players));
  console.log(`Leader actuel : ${game.leaderId}`);

  const player = game.addPlayer(playerName, socket);
  if (!player) {
    socket.emit("errorMessage", "Room pleine ou nom déjà pris.");
    return;
  }

  if (!game.leaderId) {
    game.leaderId = socket.id;
    socket.emit("youAreLeader");
    console.log(`Leader assigné - ${playerName} (${socket.id})`);
  }
  io.to(room).emit("playerListUpdated", {
    players: Object.values(game.players).map((p) => ({
      name: p.name,
      isLeader: p.socket.id === game.leaderId
    }))
  });

  const numPlayers = Object.keys(game.players).length;
  if (numPlayers === 1) {
    socket.emit("waitingForPlayer", "En attente d'un autre joueur...");
  } else if (numPlayers >= 2) {
    Object.values(game.players).forEach((p) => {
      if (p.socket.id === game.leaderId) {
        p.socket.emit("readyToStart", { isLeader: true });
      } else {
        p.socket.emit("waitingForLeader");
      }
    });
  }
  // Log après toutes les émissions
  console.log(`État final - Room: ${room}, Leader: ${game.leaderId}`);


  socket.on("disconnect", () => {
    handlePlayerDisconnect(room, socket.id);
  });
}

function handlePlayerDisconnect(room, socketId) {
  const game = games[room];
  if (!game) return;

  if (game.mode === "multiplayer") {
    const player = game.getPlayerBySocketId(socketId);
    if (player) {
      game.removePlayer(player.id);
      if (game.isGameOver()) {
        io.to(room).emit("gameOver", { winner: game.getWinner() });
        delete games[room];
      } else {
        if (game.leaderId === socketId) {
          const remainingPlayers = Object.keys(game.players);
          if (remainingPlayers.length > 0) {
            game.leaderId = remainingPlayers[0];
            io.to(game.players[game.leaderId].socket.id).emit("youAreLeader");
          } else {
            game.leaderId = null;
          }
        }
        io.to(room).emit("playerDisconnected", { playerId: player.id });
      }
    }
  }
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", ({ room, playerName, mode }) => {
    if (mode === "solo") {
      handleSoloMode(room, playerName, socket);
    } else if (mode === "multiplayer") {
      handleMultiplayerMode(room, playerName, socket);
    } else {
      socket.emit("errorMessage", "Mode non supporté.");
    }
  });

  // Gestion de l'événement playerReady (pour le multijoueur)
  socket.on("playerReady", ({ room }) => {
    const game = games[room];
    if (game && game.mode === "multiplayer") {
      const player = game.getPlayerBySocketId(socket.id);
      if (player) {
        player.isReady = true;
        const allReady = Object.values(game.players).every((p) => p.isReady);
        if (allReady) {
          io.to(room).emit("readyToStart");
        }
      }
    }
  });

  // Gestion de l'événement startGame
  socket.on("startGame", ({ room }) => {
    const game = games[room];
    if (game) {
      if (game.mode === "solo") {
        // Le jeu solo démarre automatiquement
        return;
      }

      if (game.mode === "multiplayer") {
        if (socket.id !== game.leaderId) {
            socket.emit("errorMessage", "Seul le leader peut démarrer la partie.");
            return;
        }

        if (Object.keys(game.players).length < 2) {
            socket.emit("errorMessage", "Il faut au moins deux joueurs pour démarrer !");
            return;
        }

        console.log(`Démarrage du jeu multijoueur pour la room : ${room}`);
        const pieceSequence = pieceSequence(); // Génère une séquence unique pour tous les joueurs
        game.pieceSequence = pieceSequence;

        // Envoie la séquence à tous les joueurs de la room
        io.to(room).emit("gameStarted", { pieces: pieceSequence });
        console.log("Séquence de pièces générée pour la room :", pieceSequence);
    }
  }
  });

  // Gestion de l'événement lineComplete
  socket.on("lineComplete", ({ room, lines }) => {
    const game = games[room];
    if (!game) return;

    if (game.mode === "solo") {
      game.handleLineCompletion(lines);
    } else if (game.mode === "multiplayer") {
      game.handleLineCompletion(socket.id, lines);
    }
  });

  // Gestion de l'événement gameOver
  socket.on("gameOver", ({ room }) => {
    const game = games[room];
    if (game) {
      if (game.mode === "solo") {
        game.handleGameOver();
      } else {
        game.handlePlayerGameOver(socket.id);
        const winnerId = game.checkGameOver();
        if (winnerId) {
          io.to(room).emit("gameOver", { winner: game.players[winnerId].name });
          game.resetGame();
        }
      }
    }
  });

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    for (const room in games) {
      const game = games[room];
      if (game.mode === "solo" && game.player?.socket.id === socket.id) {
        delete games[room];
        console.log(`Jeu solo ${room} supprimé suite à la déconnexion.`);
      } else if (game.mode === "multiplayer") {
        const player = game.getPlayerBySocketId(socket.id);
        if (player) {
          game.removePlayer(player.id);
          if (game.isGameOver()) {
            io.to(room).emit("gameOver", { winner: game.getWinner() });
            delete games[room];
          } else {
            if (game.leaderId === socket.id) {
              const remainingPlayers = Object.keys(game.players);
              game.leaderId = remainingPlayers[0] || null;
              if (game.leaderId) {
                io.to(game.leaderId).emit("youAreLeader");
              }
            }
            io.to(room).emit("playerDisconnected", { playerId: player.id });
          }
        }
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
