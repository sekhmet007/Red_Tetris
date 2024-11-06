// src/server/models/Game.js
import createPlayer from "./Player.js";
import  generatePiece  from "./Piece.js";


function createGame(roomName) {
  const players = {};
  const pieceSequence = [];
  let isStarted = false;
  let leaderId = null;

  function addPlayer(name, socket) {
    if (Object.keys(players).length >= 2) return null;
    const player = createPlayer(name, socket);
    players[player.id] = player;
    if (!leaderId) leaderId = player.id;
    socket.join(roomName);
    return player;
  }

  function removePlayer(playerId) {
    delete players[playerId];
    if (leaderId === playerId) {
      const remainingPlayers = Object.keys(players);
      leaderId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
    }
    if (Object.keys(players).length === 0) resetGame();
  }

  function distributePieces() {
    const piece = generatePiece();
    pieceSequence.push(piece);
    Object.values(players).forEach((player) => player.sendPiece(piece.clone()));
  }

  function startGame() {
    if (isStarted) return;
    isStarted = true;
    pieceSequence.length = 0;
    Object.values(players).forEach((player) => player.reset());
    distributePieces();
  }

  function resetGame() {
    isStarted = false;
    Object.values(players).forEach((player) => player.notifyEndGame());
  }

  function handleLineCompletion(playerId, linesCompleted) {
    const opponentId = Object.keys(players).find((id) => id !== playerId);
    if (opponentId) {
      players[opponentId].receivePenaltyLines(linesCompleted);
    }
  }

  function getPlayerBySocketId(socketId) {
    return Object.values(players).find(player => player.socketId === socketId);
  }

  function isReadyToStart() {
    // Le jeu est prêt à démarrer si deux joueurs sont présents et le jeu n'est pas encore commencé
    return Object.keys(players).length === 2 && !isStarted;
  }

  function isGameOver() {
    return Object.keys(players).length === 0;
  }

  // Nouvelle fonction getWinner pour identifier le dernier joueur restant
  function getWinner() {
    return Object.keys(players)[0] || null;
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
	  isReadyToStart,
	  getPlayerBySocketId,
    isGameOver, 
    getWinner,
    isGameOver,
  };
}

export default createGame;
