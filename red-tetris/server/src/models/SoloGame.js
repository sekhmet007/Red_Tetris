// src/server/models/SoloGame.js

import createPlayer from './Player.js';
import { generatePiece } from './Piece.js';

function createSoloGame(roomName, playerName, socket, io) {
  const mode = 'solo';
  const player = createPlayer(playerName, socket);
  const pieceSequence = [];
  let isStarted = false;

  function startGame() {
    if (isStarted) return;
    isStarted = true;

    for (let i = 0; i < 100; i++) {
      pieceSequence.push(generatePiece());
    }
    player.sendPiece(pieceSequence);
    player.reset();

    io.to(roomName).emit('gameStarted', { pieces: pieceSequence });
  }

  function handleLineCompletion(lines) {
    player.updateScore(lines);
  }

  function handleGameOver() {
    player.notifyEndGame();
    io.to(roomName).emit('gameOver');
    isStarted = false;
  }

  function resetGame() {
    isStarted = false;
    pieceSequence.length = 0;
    player.notifyEndGame();
    player.reset();
  }
  return {
    roomName,
    playerName,
    mode,
    pieceSequence,
    isStarted,
    startGame,
    handleLineCompletion,
    handleGameOver,
    resetGame,
  };
}

export default createSoloGame;
