import express from "express";
import http from "http";
import * as redis from "redis";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import createGame from "./Models/Game.js";
import createPlayer from "./Models/Player.js";

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

// Afficher les rooms actives
app.get("/rooms", (req, res) => {
  const activeRooms = Object.keys(games).map(roomName => ({
    roomName,
    players: Object.keys(games[roomName].players).length,
    isStarted: games[roomName].isStarted,
  }));
  res.json(activeRooms.filter(room => !room.isStarted));
});

app.get("/:room/:playerName", (req, res) => {
  const { room, playerName } = req.params;
  res.sendFile(path.join(buildPath, "index.html"));
  req.socket.room = room;
  req.socket.playerName = playerName;
  res.sendFile(path.join(buildPath, "index.html"));
});

// Route pour le mode solo
app.get("/solo", (req, res) => {
  try {
    const playerName = `Player_${Date.now()}`;
    const roomName = `Solo_${playerName}`;
    // Vérifiez que la création de la room fonctionne
    if (!games[roomName]) {
      games[roomName] = createGame(roomName);
    }
    // Renvoyez explicitement un objet JSON
    res.json({
      roomUrl: `http://localhost:3000/?room=${roomName}&playerName=${playerName}`,
      success: true
    });
  } catch (error) {
    console.error("Erreur lors de la création de la room solo :", error);
    res.status(500).json({ error: "Impossible de créer la room solo" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});
const games = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", ({ room, playerName }) => {
    if (!games[room]) {
      games[room] = createGame(room);
    }

    const game = games[room];

    if (game.isStarted) {
      socket.emit(
        "errorMessage",
        "La partie a déjà commencé. Veuillez attendre la fin."
      );
      return;
    }

    // Ajout du joueur
    const player = game.addPlayer(playerName, socket);
    if (!player) {
      socket.emit("errorMessage", "La partie est pleine.");
      return;
    }

    socket.join(room);
    console.log(`Player ${playerName} joined room: ${room}`);

    // Affiche l'URL de connexion pour inviter d'autres joueurs
    const inviteUrl = `http://localhost:3000/${room}/${playerName}`;
    socket.emit("inviteUrl", inviteUrl);

    // Gestion de l'attente d'un deuxième joueur
    const numPlayers = Object.keys(game.players).length;
    if (numPlayers === 1) {
      socket.emit("waitingForPlayer", "En attente d'un autre joueur...");
    } else if (numPlayers === 2) {
      if (game.leaderId === socket.id) {
        socket.emit("readyToStart", {
          message:
            "Vous êtes le leader. Cliquez sur 'Start Game' pour démarrer.",
        });
      }
      io.to(room).emit("readyToStart");
    }
  });

  socket.on("joinRoom", ({ room, playerName }) => {
    if (!games[room]) {
      games[room] = createGame(room);
    }
  
    const game = games[room];
  
    if (game.isStarted) {
      socket.emit("errorMessage", "La partie a déjà commencé.");
      return;
    }
  
    const player = game.addPlayer(playerName, socket);
    if (!player) {
      socket.emit("errorMessage", "Room pleine ou nom déjà pris.");
      return;
    }
  
    socket.join(room);
    console.log(`${playerName} a rejoint la room ${room}`);
  
    // Notifier les joueurs de la liste mise à jour
    io.to(room).emit("playerListUpdated", {
      players: Object.values(game.players).map((p) => p.name),
    });
  });
  


  socket.on("playerReady", ({ room }) => {
    const game = games[room];
    const player = game.getPlayerBySocketId(socket.id);
    if (player) {
        player.isReady = true;
        const allReady = Object.values(game.players).every(p => p.isReady);
        if (allReady) {
            io.to(room).emit("readyToStart");
        }
    }
  });

  socket.on("startGame", ({ room }) => {
    const game = games[room];
    if (game.leaderId === socket.id) {
      game.startGame();
      io.to(room).emit("gameStarted", { pieces: game.pieceSequence });
    } else {
      socket.emit("errorMessage", "Seul le leader peut démarrer la partie.");
    }
  });

  socket.on("lineComplete", ({ room, lines }) => {
    const game = games[room];
    if (game) {
      game.handleLineCompletion(socket.id, lines); // Distribution des pénalités
    }
  });

  socket.on("gameOver", ({ room }) => {
    const game = games[room];
    if (game) {
      const winnerId = game.checkGameOver();
      if (winnerId) {
        io.to(room).emit("gameOver", { winner: game.players[winnerId].name });
        game.resetGame(); // Réinitialise la room uniquement si nécessaire
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    for (const room in games) {
      const game = games[room];
      const player = game.getPlayerBySocketId(socket.id);

      if (player) {
        game.removePlayer(player.id);

        if (game.isGameOver()) {
          io.to(room).emit("gameOver", { winner: game.getWinner() });
          delete games[room];
        } else {
          // Réattribution du leader si le joueur déconnecté était le leader
          if (game.leaderId === socket.id) {
            const newLeaderId = Object.keys(game.players)[0];
            game.leaderId = newLeaderId;
            io.to(newLeaderId).emit("youAreLeader"); // Envoie un message au nouveau leader
          }

          io.to(room).emit("playerDisconnected", { playerId: player.id });
        }
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
