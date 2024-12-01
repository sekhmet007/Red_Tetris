// src/server/models/Game.js
import createPlayer from "./Player.js";
import generatePieceSequence from "./Piece.js";

function createGame(roomName, io) {
  const mode = "multiplayer";
  const players = {};
  const pieceSequence = [];
  let isStarted = false;
  let leaderId = null;

  function addPlayer(name, socket) {
    if (Object.values(players).some((p) => p.name === name)) return null; // Empêche les doublons de nom
    const player = createPlayer(name, socket);
    players[player.id] = player;

    if (!leaderId) leaderId = player.id; // Le premier joueur devient leader par défaut
    return player;
  }

  function removePlayer(playerId) {
    delete players[playerId];
    if (leaderId === playerId) {
      const remainingPlayers = Object.keys(players);
      leaderId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
      if (leaderId) {
        players[leaderId].socket.emit("youAreLeader");
        io.to(roomName).emit("leaderChanged", players[leaderId].name);
      }
    }
    if (Object.keys(players).length === 0) resetGame();
  }

  function distributePieces() {
    if (pieceSequence.length === 0) {
      for (let i = 0; i < 100; i++) {
        pieceSequence.push(...generatePieceSequence());
      }
    }
    Object.values(players).forEach((player) => player.sendPiece(pieceSequence));
  }

  function startGame() {
    if (isStarted) return; // Empêche de redémarrer une partie déjà en cours
    isStarted = true;

    for (let i = 0; i < 100; i++) {
      pieceSequence.push(generatePieceSequence());
    }

    // Synchronise les joueurs
    Object.values(players).forEach((player) => {
      player.sendPieceSequence(pieceSequence);
      player.reset();
    });
    io.to(roomName).emit("gameStarted", { pieces: pieceSequence });
  }

  function resetGame() {
    isStarted = false;
    pieceSequence.length = 0; // Réinitialiser la séquence des pièces
    Object.values(players).forEach((player) => {
      if (Object.keys(players).length > 1) {
        // Mode multijoueur : notifier les joueurs
        player.notifyEndGame();
        player.reset();
      }
    });
  }

  function handleLineCompletion(playerId, lines) {
    Object.values(players).forEach((player) => {
      if (player.id !== playerId) {
        player.receivePenaltyLines(lines - 1);
      }
    });
  }

  function getPlayerBySocketId(socketId) {
    return Object.values(players).find(
      (player) => player.socket.id === socketId
    );
  }

  function handlePlayerGameOver(playerId) {
    const player = players[playerId];
    if (!player) return;

    player.notifyEndGame();
    removePlayer(playerId);

    if (checkGameOver()) {
      const winnerId = checkGameOver();
      io.to(roomName).emit("gameOver");
      resetGame();
    }
  }

  function checkGameOver() {
    const activePlayers = Object.values(players).filter((player) => !player.isGameOver);
    if (activePlayers.length === 1) {
      return activePlayers[0].id; // Retourne l'ID du gagnant
    }
    return null; // Pas encore terminé
  }


  return {
    mode,
    roomName,
    players,
    pieceSequence,
    isStarted,
    leaderId,
    addPlayer,
    removePlayer,
    distributePieces,
    startGame,
    resetGame,
    handleLineCompletion,
    getPlayerBySocketId,
    checkGameOver,
    handlePlayerGameOver,
  };
}

export default createGame;
