import express from "express";
import http from "http";
import * as redis from "redis";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import createGame from "./Models/Game.js";
import createPlayer from "./Models/Player.js";

// Pour résoudre __dirname dans un module ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

// Configure Redis
const client = redis.createClient();

client.on("connect", () => {
  console.log("Connected to Redis");
});

client.on("error", (err) => {
  console.error("Redis connection error:", err);
});

// Middleware pour parser le JSON
app.use(express.json());

// Servir les fichiers statiques du client avec un chemin absolu
const buildPath = path.resolve(__dirname, "../client/red-tetris/build");
app.use(express.static(buildPath));

// Gestion des scores avec Redis
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

// Utilisation de l'URL pour extraire room et playerName
app.get("/:room/:playerName", (req, res) => {
  const { room, playerName } = req.params;
  res.sendFile(path.join(buildPath, "index.html"));

  // Stockage temporaire des informations de connexion
  req.socket.room = room;
  req.socket.playerName = playerName;
  res.sendFile(path.join(buildPath, "index.html"));
});

// Route par défaut pour servir index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// Gestion des parties de jeu avec Socket.IO
const games = {}; // Stockage pour les parties en cours

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Événement pour que le joueur rejoigne une salle avec les informations de `room` et `playerName`
  socket.on("joinRoom", ({ room, playerName }) => {
    if (!games[room]) {
      games[room] = createGame(room);  // Création d'une nouvelle partie si elle n'existe pas encore
    }

    const game = games[room];

    // Vérifiez si la partie a déjà commencé
    if (game.isStarted) {
      socket.emit("errorMessage", "La partie a déjà commencé. Veuillez attendre la fin.");
      return;
    }

    // Création du joueur et ajout à la salle
    const player = createPlayer(playerName, socket);
    game.addPlayer(player, socket);
    socket.join(room);

    // Informer les autres joueurs dans la salle qu'un nouveau joueur a rejoint
    io.to(room).emit("playerJoined", { playerName });

    // Vérifiez si deux joueurs sont dans la salle pour démarrer la partie
    const numPlayers = Object.keys(game.players).length;
    if (numPlayers === 1) {
      // Indiquer au joueur qu'il est en attente d'un deuxième joueur
      socket.emit("waitingForPlayer", "En attente d'un autre joueur...");
    } else if (numPlayers === 2) {
      // Informer le leader qu'il peut démarrer la partie
      if (game.leaderId === socket.id) {
        socket.emit("readyToStart", { message: "Vous êtes le leader. Cliquez sur 'Start Game' pour démarrer." });
        game.isLeader = true;
      }
      // Informer tous les joueurs que la partie est prête à démarrer
      io.to(room).emit("readyToStart");
    }
  });

  // Événement pour démarrer la partie - seul le leader peut lancer la partie
  socket.on("startGame", ({ room }) => {
    const game = games[room];
    if (game && game.leaderId === socket.id && Object.keys(game.players).length >= 2) {
      game.startGame();
      io.to(room).emit("gameStarted", { pieces: game.distributePieces() });
    }
  });

  // Événement pour les lignes complétées par un joueur
  socket.on("lineComplete", ({ room, lines }) => {
    const game = games[room];
    if (game) {
      game.handleLineCompletion(socket.id, lines);
      io.to(room).emit("penaltyApplied", { lines });
    }
  });

  // Événement pour la fin de partie pour un joueur
  socket.on("gameOver", ({ room, playerId }) => {
    const game = games[room];
    if (game) {
      game.removePlayer(playerId);
      io.to(room).emit("playerGameOver", { playerId });
      if (game.isGameOver()) {
        io.to(room).emit("gameOver", { winner: game.getWinner() });
      }
    }
  });

  // Déconnexion d'un joueur
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    for (const room in games) {
      const game = games[room];
      const player = game.getPlayerBySocketId(socket.id);
      if (player) {
        game.removePlayer(player.id);
        io.to(room).emit("playerDisconnected", { playerId: player.id });
        if (game.isGameOver()) {
          io.to(room).emit("gameOver", { winner: game.getWinner() });
        }
      }
    }
  });
});
// Lancer le serveur avec Socket.IO
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});