// src/server/models/Player.js

import { v4 as uuidv4 } from "uuid";
function createPlayer(name, socket) {
  const id = uuidv4();
  const terrain = Array.from({ length: 20 }, () => Array(10).fill(0));
  let spectre = Array(10).fill(20); // Initialiser la hauteur pour chaque colonne

  function sendPiece(piece) {
    socket.emit("newPiece", piece);
  }

  function receivePenaltyLines(lines, fromPlayer = null) {
    if (fromPlayer === id) return; // Ignore les pénalités venant de soi-même

    for (let i = 0; i < lines; i++) {
      terrain.pop();
      terrain.unshift(Array(10).fill(-1)); // Ligne de pénalité indestructible
    }
    updateSpectre();
  }

  function updateSpectre() {
    spectre = terrain[0].map((_, x) =>
      terrain.findIndex((row) => row[x] === 1)
    );
    socket.emit("updateSpectre", spectre);
  }

  function reset() {
    for (let row of terrain) row.fill(0);
    updateSpectre();
  }

  function notifyEndGame() {
    socket.emit("gameOver");
  }

  return {
    id,
    name,
    socket,
    terrain,
    spectre,
    sendPiece,
    receivePenaltyLines,
    updateSpectre,
    reset,
    notifyEndGame,
  };
}

export default createPlayer;
