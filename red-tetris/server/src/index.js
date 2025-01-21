import express from 'express';
import http from 'http';
import * as redis from 'redis';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

import createGame from './models/Game.js';
import createSoloGame from './models/SoloGame.js';
import { generatePieceSequence } from './models/Piece.js';

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type'],
    },
});

const PORT = 3000;

const client = redis.createClient();

client.on('connect', () => {
});

client.on('error', (err) => {
    console.error('Redis connection error:', err);
    process.exit(1);
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
    cors({
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    })
);

app.use(express.json());

const buildPath = path.resolve(__dirname, '../client/red-tetris/build');
app.use(express.static(buildPath));

const games = {};

app.get('/', (req, res) => {
    res.send('Backend is running');
});

app.get('/score/:userId', async (req, res) => {
    const userId = req.params.userId;
    client.get(`score:${userId}`, (err, score) => {
        if (err) return res.status(500).send(err);
        res.json({ score: score || 0 });
    });
});

app.post('/score/:userId', (req, res) => {
    const userId = req.params.userId;
    const { score } = req.body;
    client.set(`score:${userId}`, score, (err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Score updated' });
    });
});

const generateRoomName = () => {
    let roomNumber = 0;
    while (games[`Room_${roomNumber}`]) {
        roomNumber++;
    }
    return `Room_${roomNumber}`;
};

app.get('/rooms', (req, res) => {

    while (
        Object.keys(games).filter(
            (room) => !games[room].isStarted && games[room].mode === 'multiplayer'
        ).length < 3
    ) {
        const roomName = generateRoomName();
        games[roomName] = createGame(roomName, io);
    }

    const activeRooms = Object.keys(games)
        .filter((roomName) => games[roomName].mode === 'multiplayer')
        .map((roomName) => {
            const playersCount = Object.keys(games[roomName].players).length;
            return {
                roomName,
                players: playersCount,
                isStarted: games[roomName].isStarted,
            };
        });

    const filteredRooms = activeRooms.filter(
        (room) => room.roomName && room.roomName !== 'null'
    );

    res.json(filteredRooms);
});

app.get('/solo', (req, res) => {
    try {
        const playerName = `Player_${Date.now()}`;
        const roomName = `Solo_${playerName}`;
        res.json({
            roomUrl: `http://localhost:3000/?room=${roomName}&playerName=${playerName}&mode=solo`,
            success: true,
        });
    } catch (error) {
        console.error('Erreur lors de la création de la room solo :', error);
        res.status(500).json({ error: 'Impossible de créer la room solo' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

function handleSoloMode(room, playerName, socket) {
    if (!games[room]) {
        games[room] = {
            ...createSoloGame(room, playerName, socket, io),
            mode: 'solo',
        };
    }

    const game = games[room];
    socket.join(room);

    game.startGame();

    socket.on('lineComplete', ({ lines }) => {
        game.handleLineCompletion(lines);
    });

    socket.on('gameOver', () => {
        game.handleGameOver();
    });

    socket.on('restartGame', () => {
        game.resetGame();
        game.startGame();
    });
}

function handleMultiplayerMode(room, playerName, socket) {
    // 1) Création ou récupération du game
    if (!games[room]) {
        console.log('Création du jeu pour la room :', room);
        games[room] = { ...createGame(room, io), mode: 'multiplayer' };
    }
    const game = games[room];

    // 2) Vérifier si la partie est déjà démarrée
    if (game.isStarted) {
        socket.emit('errorMessage', 'La partie a déjà commencé.');
        socket.emit('gameStarted', { pieces: game.pieceSequence });
        return null;
    }

    // 3) Ajouter le joueur
    const player = game.addPlayer(playerName, { id: socket.id, socket });
    if (!player) {
        socket.emit('errorMessage', 'Room pleine ou nom déjà pris.');
        return null;
    }

    socket.emit('playerCreated', {
        realUuid: player.id
    });

    // 4) Rejoindre la room Socket.IO
    socket.join(room);

    // 5) Définir le leader si besoin
    if (!game.leaderId) {
        game.leaderId = socket.id;
        console.log(`Nouveau leader défini: ${playerName} (${socket.id})`);
        socket.emit('youAreLeader');
    }

    // 6) Mettre à jour la liste des joueurs pour tous
    io.to(room).emit('playerListUpdated', {
        players: Object.values(game.players).map((p) => ({
            name: p.name,
            isLeader: p.socket.id === game.leaderId,
        })),
    });

    // 7) **Annoncer le statut de la room** (le fameux code que tu voulais exécuter après)
    const numPlayers = Object.keys(game.players).length;
    if (numPlayers === 1) {
        socket.emit('waitingForPlayer', "En attente d'un autre joueur...");
    } else if (numPlayers >= 2) {
        // Informer le leader qu’il peut démarrer
        if (socket.id === game.leaderId) {
            socket.emit('canStartGame', true);
        }
        // Informer les autres joueurs qu’ils attendent le leader
        Object.values(game.players).forEach((p) => {
            if (p.socket.id !== game.leaderId) {
                p.socket.emit('waitingForLeader');
            }
        });
    }

    // 8) **Enfin**, retourner le player pour que l'appelant puisse l’exploiter
    return player;
}

io.on('connection', (socket) => {

    function isValidRoom(room) {
        return typeof room === 'string' && room.trim().length > 0;
    }

    function isValidPlayerName(playerName) {
        return typeof playerName === 'string' && playerName.trim().length > 0;
    }

    socket.on('joinRoom', ({ room, playerName, mode }) => {
        try {
            // Validation du nom de salle
            if (!isValidRoom(room)) {
                socket.emit('errorMessage', 'Nom de salle invalide.');
                return;
            }

            // Validation du nom de joueur
            if (!isValidPlayerName(playerName)) {
                socket.emit('errorMessage', 'Nom de joueur invalide.');
                return;
            }

            if (mode === 'solo') {
                // Gérer le mode solo
                console.log(`Joueur ${playerName} rejoint le mode solo dans la salle ${room}.`);
                handleSoloMode(room, playerName, socket);
            } else if (mode === 'multiplayer') {
                //handleMultiplayerMode(room, playerName, socket);
                console.log(`Joueur ${playerName} rejoint le mode multijoueur dans la salle ${room}.`);

                const player = handleMultiplayerMode(room, playerName, socket); // Créer et associer le joueur
                if (!player) {
                    socket.emit('errorMessage', 'Erreur lors de la création du joueur multijoueur.');
                    return;
                }

                // Associer le joueur à la salle
                player.setRoomName(room);
                socket.join(room);
                console.log(`${playerName} a rejoint la salle ${room}.`);
            } else {
                socket.emit('errorMessage', 'Mode non supporté.');
            }
        } catch (error) {
            console.error('Erreur dans joinRoom:', error.message);
            socket.emit('errorMessage', 'Une erreur est survenue. Veuillez réessayer.');
        }
    });

    socket.on('leaveRoom', ({ room, playerName }) => {
        const game = games[room];
        if (!game) {
            console.error(`La room ${room} n'existe pas.`);
            return;
        }

        // Retirer le joueur de la room
        const player = game.getPlayerBySocketId(socket.id);
        if (player) {
            game.removePlayer(player.id);
        }

        // Notifier tous les clients des rooms mises à jour
        const activeRooms = Object.keys(games)
            .filter((roomName) => games[roomName].mode === 'multiplayer')
            .map((roomName) => ({
                roomName,
                players: Object.keys(games[roomName].players).length,
                isStarted: games[roomName].isStarted,
            }));

        io.emit('roomsUpdated', activeRooms);

        console.log(`Le joueur ${playerName} a quitté la room ${room}.`);
    });

    socket.on('getActiveRooms', (_, callback) => {
        const activeRooms = Object.keys(games)
            .filter((roomName) => games[roomName].mode === 'multiplayer')
            .map((roomName) => ({
                roomName,
                players: Object.keys(games[roomName].players).length,
                isStarted: games[roomName].isStarted,
            }));
        callback(activeRooms);
    });

    socket.on('playerReady', ({ room }) => {
        const game = games[room];
        if (game && game.mode === 'multiplayer') {
            const player = game.getPlayerBySocketId(socket.id);
            if (player) {
                player.isReady = true;
                const allReady = Object.values(game.players).every((p) => p.isReady);
                if (allReady) {
                    io.to(room).emit('readyToStart');
                }
            }
        }
    });

    socket.on('startGame', ({ room }) => {
        console.log('Réception de la demande startGame:', { room });
        const game = games[room];

        if (!game) {
            console.error('Jeu non trouvé pour la room:', room);
            return;
        }

        if (game.mode !== 'solo') {
            console.error('Mode de jeu incorrect:', game.mode);
            return;
        }

        if (game.isStarted) {
            console.log('La partie solo est déjà démarrée');
            socket.emit('errorMessage', 'La partie solo a déjà commencé.');
            return;
        }

        console.log('Démarrage de la partie solo...');
        game.isStarted = true;
        const pieceSequence = generatePieceSequence();
        game.pieceSequence = pieceSequence;

        console.log('Envoi des pièces initiales...');
        socket.emit('gameStarted', {
            pieces: pieceSequence,
            initialGrid: Array.from({ length: 20 }, () => Array(10).fill(0)),
        });

        console.log('Partie solo démarrée avec succès');
    });

    socket.on('startGameMulti', ({ room }, callback) => {
        const game = games[room];
        if (!game || game.mode !== 'multiplayer') {
            console.log(`Erreur: Room introuvable ou mode incorrect pour ${room}`);
            if (callback) callback({ error: 'Room introuvable ou mode incorrect.' });
            return;
        }

        if (game.isStarted) {
            console.log(`La partie dans ${room} a déjà commencé.`);
            if (callback) callback({ error: 'La partie multijoueur a déjà commencé.' });
            return;
        }

        if (Object.keys(game.players).length < 2) {
            console.log(`Pas assez de joueurs dans la room ${room}.`);
            if (callback) callback({ error: 'Il faut au moins deux joueurs pour démarrer !' });
            return;
        }

        if (socket.id !== game.leaderId) {
            console.log(`Socket ${socket.id} n'est pas le leader pour la room ${room}.`);
            if (callback) callback({ error: 'Seul le leader peut démarrer la partie.' });
            return;
        }

        game.isStarted = true;
        const pieceSequence = generatePieceSequence();
        game.pieceSequence = pieceSequence;

        console.log(`Avant émission de l'événement gameStarted pour la room ${room}.`);

        io.to(room).emit('gameStarted', {
            pieces: pieceSequence,
            initialGrid: Array.from({ length: 20 }, () => Array(10).fill(0)),
        });

        console.log(`Événement gameStarted émis pour la room ${room} avec les pièces :`, pieceSequence);

        if (callback) callback({ success: true });
    });

    socket.on('lineComplete', ({ room, lines }) => {
        console.log(`Réception de lineComplete - Room: ${room}, Lines: ${lines}`);
        try {
            const game = games[room];
            if (!game) return;

            if (game.mode === 'solo') {
                game.handleLineCompletion(lines);
            } else if (game.mode === 'multiplayer') {
                console.log(`Gestion des lignes en mode multijoueur pour ${socket.id}`);
                game.handleLineCompletion(socket.id, lines);
            }
        } catch (error) {
            console.error('Erreur dans lineComplete:', error);
            socket.emit('error', { message: 'Une erreur est survenue' });
        }
    });

    socket.on('playerLost', ({ room, playerId }) => {
        console.log(`[playerLost] Reçu du joueur: ${playerId} dans la room: ${room}`);
        const game = games[room];
        if (game && game.mode === 'multiplayer') {
            console.log("[playerLost] Appel de game.handlePlayerGameOver");
            game.handlePlayerGameOver(playerId);
            // handlePlayerGameOver va décider si c’est match nul, un vainqueur, ou rien.
        }
    });

    socket.on('gameOver', ({ room }) => {
        const game = games[room];
        if (game) {
            if (game.mode === 'solo') {
                game.handleGameOver();
            }
        }
    });

    socket.on('disconnect', () => {
        for (const room in games) {
            const game = games[room];

            if (game.mode === 'solo' && game.player?.socket.id === socket.id) {
                console.log(`Suppression de la room solo : ${room}`);
                delete games[room];
            } else if (game && game.mode === 'multiplayer') {
                const player = game.getPlayerBySocketId(socket.id);
                if (player) {
                    console.log(`Joueur déconnecté : ${player.name} dans la room ${room}`);
                    game.removePlayer(player.id);

                    // ICI on vérifie s’il n’y a plus de joueurs en jeu
                    if (game.isGameOver()) {
                        const w = game.getWinner(); // peut être un player, null ou undefined
                        // AVANT : on émettait gameOver direct
                        // REMPLACER PAR :
                        if (!game.gameTerminated) {
                            if (w && w.name) {
                                game.handlePlayerGameOver(w.id);
                            } else {
                                game.handlePlayerGameOver(player.id);
                                // ou un handleGameOver() custom
                            }
                        }
                        // Puis on supprime le game
                        delete games[room];
                    } else {
                        if (game.leaderId === socket.id) {
                            const remainingPlayers = Object.keys(game.players);
                            game.leaderId = remainingPlayers[0] || null;
                            if (game.leaderId) {
                                io.to(game.leaderId).emit('youAreLeader');
                            }
                        }
                        io.to(room).emit('playerDisconnected', { playerId: player.id });
                    }
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
