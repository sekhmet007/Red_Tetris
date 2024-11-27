// src/server/models/Game.js
import createPlayer from "./Player.js";
import generatePiece from "./Piece.js";

function createGame(roomName) {
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

    // Génère une séquence de pièces unique
    for (let i = 0; i < 100; i++) {
      pieceSequence.push(generatePiece());
    }

    // Synchronise les joueurs
    Object.values(players).forEach((player) => {
      player.sendPieceSequence(pieceSequence);
      player.reset();
    });
  }

  function resetGame() {
    isStarted = false;
    Object.values(players).forEach((player) => player.notifyEndGame());
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
      (player) => player.socketId === socketId
    );
  }

  function startCountdown() {
    if (Object.keys(players).length === 2) {
      let countdown = 5;
      const countdownInterval = setInterval(() => {
        io.to(roomName).emit("countdown", countdown);
        countdown -= 1;
        if (countdown === 0) {
          clearInterval(countdownInterval);
          startGame();
        }
      }, 1000);
    }
  }

  function checkGameOver() {
    const activePlayers = Object.values(players).filter((player) => !player.isGameOver);
    if (activePlayers.length === 1) {
      return activePlayers[0].id; // Retourne l'ID du gagnant
    }
    return null; // Pas encore terminé
  }

  function checkWinner() {
    if (Object.keys(players).length === 1) {
      const winner = Object.keys(players)[0];
      io.to(roomName).emit("gameOver", { winner: players[winner].name });
      resetGame();
    }
  }

  return {
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
    startCountdown,
    checkGameOver,
    checkWinner,
  };
}

export default createGame;
