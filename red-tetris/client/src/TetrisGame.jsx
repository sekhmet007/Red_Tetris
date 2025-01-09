//src/client/red-tetris/src/TetrisGame.js
import { useState, useEffect, useCallback } from 'react';
import './TetrisGame.css';
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
    transports: ['websocket', 'polling'],
});

const LARGEUR_GRILLE = 10;
const HAUTEUR_GRILLE = 20;
const X_INITIAL = 3;
const Y_INITIAL = 0;

const formes = [
    // Forme I
    [
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ],
        [
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0],
        ],
        [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
        ],
        [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ],
    ],
    // Forme J
    [
        [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        [
            [0, 1, 1],
            [0, 1, 0],
            [0, 1, 0],
        ],
        [
            [0, 0, 0],
            [1, 1, 1],
            [0, 0, 1],
        ],
        [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0],
        ],
    ],
    // Forme L
    [
        [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0],
        ],
        [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1],
        ],
        [
            [0, 0, 0],
            [1, 1, 1],
            [1, 0, 0],
        ],
        [
            [1, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
        ],
    ],
    // Forme O
    [
        [
            [1, 1],
            [1, 1],
        ],
    ],
    // Forme S
    [
        [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0],
        ],
        [
            [0, 1, 0],
            [0, 1, 1],
            [0, 0, 1],
        ],
    ],
    // Forme T
    [
        [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        [
            [0, 1, 0],
            [0, 1, 1],
            [0, 1, 0],
        ],
        [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ],
        [
            [0, 1, 0],
            [1, 1, 0],
            [0, 1, 0],
        ],
    ],
    // Forme Z
    [
        [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0],
        ],
        [
            [0, 0, 1],
            [0, 1, 1],
            [0, 1, 0],
        ],
    ],
];

const pointsParLignes = [0, 40, 100, 300, 1200];

function TetrisGame() {
    const [grille, setGrille] = useState(
        Array.from({ length: HAUTEUR_GRILLE }, () => Array(LARGEUR_GRILLE).fill(0))
    );
    const [formX, setFormX] = useState(X_INITIAL);
    const [formY, setFormY] = useState(Y_INITIAL);
    const [numForme, setNumForme] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [score, setScore] = useState(0);
    const [delay] = useState(250);
    const [gameOver, setGameOver] = useState(false);
    const [fastDrop, setFastDrop] = useState(false);
    const [isLeader, setIsLeader] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [pieceSequence, setPieceSequence] = useState([]);
    const [pieceIndex, setPieceIndex] = useState(0);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const params = new URLSearchParams(window.location.search);
    const [room, setRoom] = useState(() => params.get('room'));
    const [playerName, setPlayerName] = useState(
        () => params.get('playerName') || null
    );

    const [mode, setMode] = useState(() => params.get('mode'));



    const joinRoom = (roomName) => {
        if (!roomName || roomName === 'null') {
            alert('Room invalide. Veuillez sélectionner une autre room.');
            return;
        }
        const playerName = prompt('Entrez votre nom');
        if (playerName) {
            setRoom(roomName);
            setPlayerName(playerName);
            setMode('multiplayer');
            window.history.pushState(
                null,
                '',
                `/?room=${roomName}&playerName=${playerName}&mode=multiplayer`
            );
        } else {
            alert('Nom du joueur requis !');
        }
    };

    const startSoloGame = () => {
        fetch('http://localhost:3000/solo')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                if (data.roomUrl) {
                    const urlParams = new URL(data.roomUrl);
                    const newRoom = urlParams.searchParams.get('room');
                    const newPlayerName = urlParams.searchParams.get('playerName');
                    const newMode = urlParams.searchParams.get('mode') || 'solo';
                    setMode(newMode);
                    setRoom(newRoom);
                    setPlayerName(newPlayerName);
                    window.history.pushState(
                        null,
                        '',
                        `/?room=${newRoom}&playerName=${newPlayerName}&mode=${newMode}`
                    );
                } else {
                    console.error("Erreur : l'URL de la room solo est manquante.");
                }
            })
            .catch((error) => {
                console.error('Erreur lors de la création de la room solo :', error);
                alert('Impossible de créer une partie solo. Réessayez.');
            });
    };

    const startMultiplayerGame = () => {
        setMode('multiplayer');
        fetch('http://localhost:3000/rooms')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP : ${response.status}`);
                }
                return response.json();
            })
            .then((rooms) => {
                const validRooms = rooms.filter(
                    (room) => room.roomName && room.roomName !== 'null'
                );
                setRooms(validRooms);
            })
            .catch((error) => {
                console.error('Erreur lors de la récupération des rooms :', error);
                alert('Impossible de récupérer les rooms. Veuillez réessayer.');
            });
    };

    const handleStartGame = () => {
        if (mode !== 'solo') {
            alert("Vous ne pouvez pas démarrer une partie solo en mode multijoueur !");
            return;
        }
    
        console.log('Démarrage de la partie solo demandé:', { room, mode });
        setIsReady(false);
    
        socket.emit('startGame', { room }, (ack) => {
            console.log('Réponse du serveur pour startGame:', ack);
            if (!ack || ack.error) {
                console.error('Erreur côté serveur (mode solo) :', ack?.error);
                alert('Impossible de démarrer la partie solo. Réessayez.');
                return;
            }
            console.log('La partie solo a bien été démarrée.');
        });
    };

    const handleStartGameMulti = () => {
        if (mode !== 'multiplayer') {
            alert("Vous ne pouvez pas démarrer une partie multijoueur en mode solo !");
            return;
        }

        if (!room || room === 'null') {
            alert('Veuillez sélectionner une room valide avant de démarrer !');
            return;
        }

        if (!isLeader) {
            alert('Seul le leader peut démarrer la partie multijoueur !');
            return;
        }

        console.log('Démarrage de la partie multijoueur...');

        setIsGameStarted(false);

        socket.emit('startGameMulti', { room }, (ack) => {
            if (!ack || ack.error) {
                console.error('Erreur côté serveur:', ack?.error);
                alert('Impossible de démarrer la partie. Réessayez.');
                return;
            }
            console.log('Requête de démarrage envoyée avec succès');
        });
    };

    const resetGame = useCallback(() => {
        setGrille(
            Array.from({ length: HAUTEUR_GRILLE }, () =>
                Array(LARGEUR_GRILLE).fill(0)
            )
        );
        setFormX(X_INITIAL);
        setFormY(Y_INITIAL);
        setRotation(0);
        setScore(0);
        setPieceSequence([]);
        setPieceIndex(0);
        setNumForme(null);
        setIsGameStarted(false);
        setIsReady(false);
        setGameOver(false);

        if (mode === 'solo') {
            socket.emit('restartGame', { room });
        }
    }, [mode, room]);

    const collision = useCallback(
        (xOffset = 0, yOffset = 0, rotationOffset = rotation) => {
            if (numForme === null || numForme === undefined) {
                return true;
            }

            if (!formes[numForme]) {
                console.warn(`Forme invalide: ${numForme}`);
                return true;
            }

            if (!formes[numForme][rotationOffset]) {
                console.warn(
                    `Rotation invalide: ${rotationOffset} pour forme ${numForme}`
                );
                return true;
            }

            const shape = formes[numForme][rotationOffset];

            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] === 1) {
                        const newX = formX + x + xOffset;
                        const newY = formY + y + yOffset;

                        if (
                            newX < 0 ||
                            newX >= LARGEUR_GRILLE ||
                            newY >= HAUTEUR_GRILLE ||
                            (newY >= 0 && grille[newY][newX] === 1)
                        ) {
                            return true;
                        }
                    }
                }
            }

            return false;
        },
        [formX, formY, rotation, grille, numForme]
    );

    const effacerLignesCompletes = useCallback(
        (newGrille) => {
            let lignesEffacees = 0;
            for (let y = 0; y < HAUTEUR_GRILLE; y++) {
                if (newGrille[y].every((cell) => cell === 1)) {
                    newGrille.splice(y, 1);
                    newGrille.unshift(Array(LARGEUR_GRILLE).fill(0));
                    lignesEffacees++;
                }
            }
            if (lignesEffacees > 0) {
                socket.emit('lineComplete', {
                    room,
                    lines: lignesEffacees,
                });
            }
            return lignesEffacees;
        },
        [room]
    );

    const fixerForme = useCallback(() => {
        const newGrille = grille.map((row) => [...row]);

        if (typeof numForme !== 'number' || !formes[numForme]) {
            console.error('fixerForme - Forme invalide pour numForme :', numForme);
            return;
        }

        formes[numForme][rotation].forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell === 1) {
                    const newX = formX + x;
                    const newY = formY + y;
                    if (
                        newY >= 0 &&
                        newY < HAUTEUR_GRILLE &&
                        newX >= 0 &&
                        newX < LARGEUR_GRILLE
                    ) {
                        newGrille[newY][newX] = 1;
                    }
                }
            });
        });

        const lignesEffacees = effacerLignesCompletes(newGrille);
        setScore(score + pointsParLignes[lignesEffacees]);
        setGrille(newGrille);

        if (mode === 'multiplayer') {
            setPieceIndex((prevIndex) => {
                const newIndex = prevIndex + 1;
                const nextPieceIndex = pieceSequence[newIndex % pieceSequence.length];
                setNumForme(nextPieceIndex);
                return newIndex;
            });
        }
        if (mode === 'solo') {
            setPieceIndex((prevIndex) => {
                const newIndex = prevIndex + 1;
                if (newIndex >= pieceSequence.length) {
                    setGameOver(true);
                    return prevIndex;
                }
                setNumForme(pieceSequence[newIndex]);
                return newIndex;
            });
        }
    }, [
        grille,
        formX,
        formY,
        rotation,
        numForme,
        score,
        effacerLignesCompletes,
        pieceSequence,
        mode,
    ]);

    const getDisplayGrid = useCallback(() => {

        if (numForme === null) {
            return grille;
        }

        const displayGrid = grille.map((row) => [...row]);

        try {
            if (!formes[numForme] || !formes[numForme][rotation]) {
                console.warn('Forme ou rotation invalide', { numForme, rotation });
                return displayGrid;
            }

            formes[numForme][rotation].forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell === 1) {
                        const newX = formX + x;
                        const newY = formY + y;
                        if (
                            newY >= 0 &&
                            newY < HAUTEUR_GRILLE &&
                            newX >= 0 &&
                            newX < LARGEUR_GRILLE
                        ) {
                            displayGrid[newY][newX] = 1;
                        }
                    }
                });
            });

            return displayGrid;
        } catch (error) {
            console.error('Erreur dans getDisplayGrid:', error);
            return displayGrid;
        }
    }, [grille, numForme, rotation, formX, formY]);

    const handleModeSelection = (selectedMode) => {

        setNumForme(null);
        setPieceSequence([]);
        setPieceIndex(0);

        if (selectedMode === 'solo') {
            startSoloGame();
        } else if (selectedMode === 'multiplayer') {
            setRoom(null);
            setPlayerName(null);
            startMultiplayerGame();
        }
    };

    const leaveRoom = (roomName) => {
        if (!roomName || roomName === 'null') {
            alert('Room invalide. Veuillez sélectionner une autre room.');
            return;
        }

        socket.emit('leaveRoom', { room: roomName, playerName });

        socket.once('roomsUpdated', (updatedRooms) => {
            setRooms(updatedRooms);
        });

        socket.emit('getActiveRooms', {}, (activeRooms) => {
            console.log('Rooms actives mises à jour :', activeRooms);
            setRooms(activeRooms);
        });

        alert(`Vous avez quitté la room : ${roomName}`);
    };

    useEffect(() => {
        // Réinitialisation de l'état du jeu lorsque le mode change
        if (!mode) return;

        setNumForme(null);
        setPieceIndex(0);
        setPieceSequence([]);
        setFormX(X_INITIAL);
        setFormY(Y_INITIAL);
        setRotation(0);
        setGrille(Array.from({ length: HAUTEUR_GRILLE }, () => Array(LARGEUR_GRILLE).fill(0)));
        setScore(0);
        setGameOver(false);
        setIsGameStarted(false);
    }, [mode]);

    useEffect(() => {
        // Génération automatique du nom du joueur si absent
        if (!playerName && socket.id) {
            setPlayerName(`Player_${socket.id}`);
        }
    }, [playerName]);

    useEffect(() => {
        // Récupération des rooms uniquement en mode multijoueur
        if (mode === 'multiplayer') {
            const fetchRooms = async () => {
                try {
                    const response = await fetch('http://localhost:3000/rooms');
                    const data = await response.json();
                    setRooms(data);
                } catch (error) {
                    console.error('Erreur lors de la récupération des rooms :', error);
                }
            };

            fetchRooms();
            const interval = setInterval(fetchRooms, 2000);

            return () => clearInterval(interval);
        }
    }, [mode]);

    useEffect(() => {
        // Gestion des événements spécifiques au mode multijoueur
        if (mode === 'multiplayer') {
            const handleGameStarted = ({ pieces }) => {
                console.log('Événement gameStarted reçu avec les pièces :', pieces);

                if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
                    console.error('Erreur : Séquence de pièces vide ou invalide reçue.');
                    alert('Impossible de démarrer la partie.');
                    return;
                }

                setPieceSequence(pieces);
                setPieceIndex(0);
                setNumForme(pieces[0]);
                setIsGameStarted(true);
                setGrille(Array.from({ length: HAUTEUR_GRILLE }, () => Array(LARGEUR_GRILLE).fill(0)));
                setFormX(X_INITIAL);
                setFormY(Y_INITIAL);
                setRotation(0);
                setScore(0);
            };

            const handlePenalty = ({ lines }) => {
                setGrille((prevGrille) => {
                    const newGrille = [...prevGrille];
                    for (let i = 0; i < lines; i++) {
                        newGrille.shift();
                        newGrille.push(Array(LARGEUR_GRILLE).fill(1));
                    }
                    return newGrille;
                });
            };
            console.log('Configuration de l\'écoute de l\'événement gameStarted...');
            socket.on('gameStarted', handleGameStarted);
            socket.on('penaltyApplied', handlePenalty);
            socket.on('youAreLeader', () => setIsLeader(true));
            socket.on('roomsUpdated', (updatedRooms) => setRooms(updatedRooms));

            return () => {
                socket.off('gameStarted', handleGameStarted);
                socket.off('penaltyApplied', handlePenalty);
                socket.off('youAreLeader');
                socket.off('roomsUpdated');
            };
        }
    }, [mode]);

    useEffect(() => {
        // Émission de l'événement pour rejoindre une room lorsqu'une room est définie
        if (mode && room && playerName) {
            socket.emit('joinRoom', { room, playerName, mode });
        }
    }, [mode, room, playerName]);

    useEffect(() => {
        // Émission de l'état "ready" uniquement si le joueur est prêt et leader
        if (isReady && isLeader) {
            socket.emit('readyToStart', { room });
        }
    }, [isReady, isLeader, room]);

    useEffect(() => {
        // Logs pour débogage
        console.log('Socket configuré et prêt à écouter.');
        console.log('isGameStarted:', isGameStarted, 'room:', room, 'playerName:', playerName);
    }, [isGameStarted, room, playerName]);

    useEffect(() => {
        if (mode === 'solo') {
            console.log('Configuration des écouteurs pour le mode solo');
            
            const handleGameStarted = ({ pieces }) => {
                console.log('Événement gameStarted reçu (solo) avec les pièces:', pieces);
    
                if (!pieces || pieces.length === 0) {
                    console.error('Erreur : Séquence de pièces vide (solo).');
                    return;
                }
    
                setPieceSequence(pieces);
                setPieceIndex(0);
                setNumForme(pieces[0]);
                setIsGameStarted(true);
            };
    
            socket.on('gameStarted', handleGameStarted);
            
            return () => {
                console.log('Nettoyage des écouteurs du mode solo');
                socket.off('gameStarted', handleGameStarted);
            };
        }
    }, [mode]);

    useEffect(() => {
        // Vérification de la validité de la séquence de pièces
        if (pieceSequence && !pieceSequence.every(index => index >= 0 && index < formes.length)) {
            console.error('Erreur : Séquence de pièces invalide !', pieceSequence);
        }
    }, [pieceSequence]);

    useEffect(() => {
        // Mise à jour des actions liées au game over
        if (gameOver && mode === 'solo') {
            socket.emit('gameOver', { room });
        }
    }, [gameOver, mode, room]);

    useEffect(() => {
        // Boucle principale pour la descente automatique des pièces
        if (!mode || gameOver) return;

        const interval = setInterval(() => {
            if (numForme === null) return;

            if (collision(0, 1)) {
                fixerForme();
                setFormX(X_INITIAL);
                setFormY(Y_INITIAL);
                setRotation(0);

                if (collision(0, 0)) {
                    setGameOver(true);
                    if (mode === 'multiplayer') {
                        socket.emit('gameOver', { room, playerId: socket.id });
                    }
                }
            } else {
                setFormY((prev) => prev + 1);
            }
        }, fastDrop ? 50 : delay);

        return () => clearInterval(interval);
    }, [collision, fixerForme, gameOver, delay, fastDrop, room, mode, numForme]);

    useEffect(() => {
        // Gestion des événements clavier pour le contrôle des pièces
        const handleKeyDown = (event) => {
            if (gameOver) return;

            if (event.key === 'ArrowLeft' && !collision(-1, 0)) {
                setFormX((prev) => prev - 1);
            } else if (event.key === 'ArrowRight' && !collision(1, 0)) {
                setFormX((prev) => prev + 1);
            } else if (event.key === 'ArrowUp') {
                const newRotation = (rotation + 1) % formes[numForme].length;
                if (!collision(0, 0, newRotation)) {
                    setRotation(newRotation);
                }
            } else if (event.key === ' ') {
                setFastDrop(true);
            }
        };

        const handleKeyUp = (event) => {
            if (event.key === ' ') {
                setFastDrop(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [collision, rotation, numForme, gameOver]);

    return (
        <div className="tetris-game">
            {/* Affichage du score uniquement si le jeu est démarré */}
            {isGameStarted && (
                <div className="score">Score: {score}</div>
            )}

            {/* Sélection du mode */}
            {!mode && (
                <div className="mode-selector">
                    <button onClick={() => handleModeSelection('solo')}>
                        Mode Solo
                    </button>
                    <button onClick={() => handleModeSelection('multiplayer')}>
                        Mode Multijoueur
                    </button>
                </div>
            )}

            {/* Liste des rooms pour le mode multijoueur */}
            {mode === 'multiplayer' && !isGameStarted && (
                <div className="room-list">
                    <h2>Rooms disponibles</h2>
                    <ul>
                        {rooms.map((room, index) => (
                            <li key={index} className="room-item">
                                <p>
                                    <strong>{room.roomName}</strong> - Joueurs : {room.players} -{' '}
                                    {room.isStarted ? 'En cours' : 'En attente'}
                                </p>
                                <div className="room-buttons">
                                    {!room.isStarted && (
                                        <>
                                            <button onClick={() => joinRoom(room.roomName)}>
                                                Rejoindre
                                            </button>
                                            <button
                                                className="leave-room-button"
                                                onClick={() => leaveRoom(room.roomName)}
                                            >
                                                Quitter
                                            </button>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <button
                        className="quit-button"
                        onClick={() => {
                            setIsGameStarted(false);
                            setMode(null);
                            setRoom(null);
                            setPlayerName(null);
                            window.history.pushState(null, '', '/');
                        }}
                    >
                        Accueil
                    </button>
                </div>
            )}

            {/* Messages pour le leader ou les joueurs */}
            {mode === 'multiplayer' && !isGameStarted && (
                <div className="waiting-section">
                    {isLeader ? (
                        rooms.find((r) => r.roomName === room)?.players >= 2 ? (
                            <button onClick={handleStartGameMulti}>
                                Démarrer
                            </button>
                        ) : (
                            <div>En attente d&apos;un second joueur</div>
                        )
                    ) : (
                        <div>En attente que le leader commence la partie...</div>
                    )}
                </div>
            )}

            {mode === 'solo' && !isGameStarted && (
                <div className="waiting-section">
                    <button onClick={handleStartGame}>
                        Démarrer
                    </button>
                </div>
            )}

            {/* Grille de jeu */}
            {isGameStarted && room && playerName && (
                <div className="tetris-grid-container">
                    <div className="tetris-grid">
                        {getDisplayGrid().map((row, y) =>
                            row.map((cell, x) => (
                                <div
                                    key={`${y}-${x}`}
                                    className={`tetris-cell ${cell === 1 ? 'filled' : ''}`}
                                />
                            ))
                        )}
                    </div>
                    <button
                        className="quit-button"
                        onClick={() => {
                            setIsGameStarted(false);
                            setMode(null);
                            setRoom(null);
                            setPlayerName(null);
                            window.history.pushState(null, '', '/');
                        }}
                    >
                        Accueil
                    </button>
                </div>
            )}

            {/* Fin de partie */}
            {gameOver && (
                <div className="game-over">
                    <h2>Game Over</h2>
                    <div className="game-over-buttons">
                        <button className="game-over-button" onClick={resetGame}>
                            Rejouer
                        </button>
                        <button
                            className="quit-button"
                            onClick={() => {
                                window.location.href = 'http://localhost:5173';
                            }}
                        >
                            Quitter
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

}
export default TetrisGame;
