// src/server/models/Player.js

import { v4 as uuidv4 } from 'uuid';

function createPlayer(name, socket) {
    const id = uuidv4();
    let score = 0;
    const terrain = Array.from({ length: 20 }, () => Array(10).fill(0));
    let spectre = Array(10).fill(20);

    function sendPiece(piece) {
        socket.emit('newPiece', piece);
    }

    function sendPieceSequence(sequence) {
        if (!sequence || sequence.length === 0) {
            console.error('Erreur : Séquence de pièces vide ou invalide !');
            return false;
        }
        socket.emit('pieceSequence', sequence);
        return true;
    }

    function updateScore(lines) {
        const pointsParLignes = [0, 40, 100, 300, 1200];
        score += pointsParLignes[lines];
        socket.emit('scoreUpdated', score);
    }

    function receivePenaltyLines(lines, fromPlayer = null) {
        if (fromPlayer === id) return;

        for (let i = 0; i < lines; i++) {
            terrain.pop();
            terrain.unshift(Array(10).fill(-1));
        }
        updateSpectre();
    }

    function updateSpectre() {
        spectre = terrain[0].map((_, x) =>
            terrain.findIndex((row) => row[x] === 1)
        );
        socket.emit('updateSpectre', spectre);
    }

    function reset() {
        for (let row of terrain) row.fill(0);
        updateSpectre();
    }

    function notifyEndGame() {
        socket.emit('gameOver');
    }

    return {
        id,
        name,
        socket,
        terrain,
        spectre,
        sendPiece,
        updateScore,
        receivePenaltyLines,
        updateSpectre,
        reset,
        notifyEndGame,
        sendPieceSequence,
    };
}

export default createPlayer;
