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

    function addPlayer(name, { id, socket }) {
        if (!isValidName(name)) {
            console.error('Nom de joueur invalide.');
            return null;
        }
        if (Object.values(players).some((p) => p.name === name)) {
            console.error(`Le joueur avec le nom "${name}" existe déjà.`);
            return null;
        }
        const player = createPlayer(name, socket, roomName); // Passer roomName ici
        players[player.id] = player;

        // Définir un leader si aucun n'est défini
        if (!leaderId) {
            leaderId = player.id;
            player.socket.emit('youAreLeader');
            io.to(roomName).emit('leaderChanged', player.name);
        }
        // leaderId is already set above if it was null
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

    function getWinner() {
        const activePlayers = Object.values(players).filter(
            (player) => !player.isGameOver
        );

        if (activePlayers.length === 1) {
            return activePlayers[0]; // Le joueur restant est le gagnant
        }

        if (activePlayers.length === 0) {
            return null; // Aucun gagnant (match nul)
        }

        // Si aucun état de fin n'est détecté, pas encore de gagnant
        return undefined;
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

    function handleLineCompletion(senderId, lines) {
        console.log(`Gestion des lignes complétées - Socket ID du joueur : ${senderId}, Lignes : ${lines}`);

        const sender = Object.values(players).find(player => player.socket.id === senderId);

        if (!sender) {
            console.error(`Erreur : Aucun joueur trouvé avec le Socket ID ${senderId}`);
            console.log('Liste actuelle des joueurs enregistrés :', Object.values(players).map(p => ({
                id: p.id,
                socketId: p.socket.id,
                name: p.name,
            })));
            return;
        }

        console.log('Début de gestion des lignes complétées :');
        console.log(`- Joueur ayant complété : ${sender.name} (ID : ${sender.id}, Socket ID : ${sender.socket.id})`);
        console.log(`- Nombre de lignes complétées : ${lines}`);

        // Mettre à jour le score du joueur
        sender.updateScore(lines);

        // Calcul des lignes de pénalité (au moins 1 ligne)
        const penaltyLines = Math.max(1, lines);
        console.log(`- Lignes de pénalité calculées : ${penaltyLines}`);

        // Appliquer les pénalités aux autres joueurs
        Object.values(players).forEach(player => {
            if (player.socket.id !== senderId) {
                console.log(`Envoi de pénalité : ${penaltyLines} lignes de ${sender.name} à ${player.name}`);

                // Émettre un événement de pénalité
                io.to(roomName).emit('penaltyApplied', {
                    lines: penaltyLines,
                    fromPlayer: sender.name,
                    toPlayer: player.name,
                });

                // Appliquer les lignes de pénalité
                player.receivePenaltyLines(penaltyLines);
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
        if (!player) {
            console.error(`Le joueur avec l'ID ${playerId} n'existe pas.`);
            return;
        }

        // Marquer le joueur comme ayant perdu
        player.isGameOver = true;
        player.notifyEndGame();

        // Vérifier s'il reste des joueurs actifs
        const activePlayers = Object.values(players).filter((p) => !p.isGameOver);

        if (activePlayers.length === 1) {
            // Déclarer le dernier joueur comme vainqueur
            const winner = activePlayers[0];
            console.log(`Le joueur ${winner.name} est déclaré vainqueur.`);
            io.to(roomName).emit('gameOver', {
                winner: winner.name,
                type: 'victory',
            });
            resetGame();
        } else if (activePlayers.length === 0) {
            // Match nul si tous les joueurs perdent en même temps
            console.log('Tous les joueurs ont perdu en même temps. Match nul.');
            io.to(roomName).emit('gameOver', {
                type: 'draw',
            });
            resetGame();
        } else {
            // Continuer la partie si plusieurs joueurs sont encore actifs
            console.log(`La partie continue avec ${activePlayers.length} joueur(s) actif(s).`);
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
        getWinner
    };
}

export default createGame;
