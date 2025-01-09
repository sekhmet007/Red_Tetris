// src/server/models/Game.js
import createPlayer from './Player.js';
import { generatePieceSequence } from './Piece.js';

function createGame(roomName, io) {

    if (!io) {
        throw new Error('Socket.IO instance manquante dans createGame');
    }
    
    const mode = 'multiplayer';
    const players = {};
    const pieceSequence = [];
    let isStarted = false;
    let leaderId = null;

    function isValidName(name) {
        return typeof name === 'string' && name.trim().length > 0;
    }

    function addPlayer(name, socket) {
        if (!isValidName(name)) {
            console.error('Nom de joueur invalide.');
            return null;
        }
        if (Object.values(players).some((p) => p.name === name)) {
            console.error(`Le joueur avec le nom "${name}" existe déjà.`);
            return null;
        }
        const player = createPlayer(name, socket);
        players[player.id] = player;
        return player;
    }

    function removePlayer(playerId) {
        delete players[playerId];
        if (leaderId === playerId) {
          const remainingPlayers = Object.keys(players);
          leaderId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
          if (leaderId) {
            players[leaderId].socket.emit('youAreLeader');
            io.to(roomName).emit('leaderChanged', players[leaderId].name);
          } else {
            console.warn('Aucun leader disponible, partie suspendue.');
            isStarted = false;
          }
        }
        if (Object.keys(players).length === 0) resetGame();
    }
    
    function getActiveRooms() {
        return Object.keys(games)
            .filter((roomName) => games[roomName].mode === 'multiplayer')
            .map((roomName) => ({
                roomName,
                players: Object.keys(games[roomName].players).length,
                isStarted: games[roomName].isStarted,
            }));
    }    

    function distributePieces() {
        Object.values(players).forEach((player) =>
            player.sendPieceSequence(pieceSequence)
        );
    }

    function startGameMulti() {
        if (isStarted) {
            console.warn('La partie a déjà commencé.');
            return false;
        }
    
        if (Object.keys(players).length < 2) {
            console.warn('Pas assez de joueurs pour démarrer.');
            return false;
        }
    
        console.log('Démarrage de la partie...');
        isStarted = true;
    
        // Générer une nouvelle séquence de pièces
        const newPieceSequence = generatePieceSequence();
        pieceSequence.length = 0;
        pieceSequence.push(...newPieceSequence);
    
        console.log('Envoi du signal de démarrage aux joueurs...');
        
        // Envoyer le signal de démarrage à tous les joueurs de la room
        io.to(roomName).emit('gameStarted', {
            pieces: pieceSequence,
            initialGrid: Array.from({ length: 20 }, () => Array(10).fill(0))
        });
    
        console.log('Signal de démarrage envoyé');
        return true;
    }

    function resetGame() {
        isStarted = false;
        pieceSequence.length = 0;
        Object.values(players).forEach((player) => {
            if (Object.keys(players).length > 1) {
                player.notifyEndGame();
                player.reset();
            }
        });
        console.log('Émission de l\'événement gameReset...');
        io.to(roomName).emit('gameReset');
    }

    function handleLineCompletion(playerId, lines) {
        Object.values(players).forEach((player) => {
            if (player.id !== playerId) {
                player.receivePenaltyLines(lines - 1);
            }
        });
        // Ajouter le broadcast des spectres après chaque modification
        Object.values(players).forEach(player => {
            player.updateSpectre();
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
            //   const winnerId = checkGameOver();
            io.to(roomName).emit('gameOver');
            resetGame();
        }
    }

    function isGameOver() {
        const activePlayers = Object.values(players).filter(
            (player) => !player.isGameOver
        );
        return activePlayers.length === 0;
    }

    function checkGameOver() {
        const activePlayers = Object.values(players).filter(
            (player) => !player.isGameOver
        );
        if (activePlayers.length === 1) {
            return activePlayers[0].id;
        }
        return null;
    }

    return {
        mode,
        roomName,
        players,
        pieceSequence,
        isStarted,
        leaderId,
        startGameMulti,
        addPlayer,
        removePlayer,
        distributePieces,
        resetGame,
        handleLineCompletion,
        getPlayerBySocketId,
        checkGameOver,
        handlePlayerGameOver,
        isGameOver,
    };
}

export default createGame;
