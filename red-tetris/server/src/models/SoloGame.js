import createPlayer from './Player.js';
import { generatePieceSequence } from './Piece.js';

function createSoloGame(roomName, playerName, socket) {
    console.log('Création d’une partie solo :', { roomName, playerName });

    const mode = 'solo'; // Mode de jeu défini comme solo
    const player = createPlayer(playerName, socket, roomName, true); // Création du joueur en mode solo
    const pieceSequence = []; // Initialisation de la séquence des pièces
    let isStarted = false; // Indique si la partie est démarrée ou non

    /**
     * Démarre la partie solo
     */
    function startGame() {
        if (isStarted) {
            console.warn('La partie solo est déjà démarrée.');
            return;
        }

        console.log(`Démarrage de la partie solo pour le joueur ${playerName} dans la room ${roomName}`);
        isStarted = true;

        // Générer une nouvelle séquence de pièces
        const newPieceSequence = generatePieceSequence(100);
        pieceSequence.length = 0; // Réinitialiser la séquence
        pieceSequence.push(...newPieceSequence); // Ajouter la nouvelle séquence

        console.log(`Séquence de pièces générée pour ${playerName} :`, newPieceSequence);

        // Réinitialiser le terrain du joueur
        player.reset();

        // Envoyer les données initiales au client
        socket.emit('gameStarted', {
            pieces: pieceSequence,
            initialGrid: Array.from({ length: 20 }, () => Array(10).fill(0)), // Grille vide initiale
        });

        console.log('Signal de démarrage de la partie envoyé au joueur.');
    }

    /**
     * Gère la complétion des lignes par le joueur
     * @param {number} lines - Nombre de lignes complétées
     */
    function handleLineCompletion(lines) {
        console.log(`Le joueur ${playerName} a complété ${lines} ligne(s).`);
        player.updateScore(lines);
    }

    /**
     * Gère la fin de la partie
     */
    function handleGameOver() {
        console.log(`Fin de partie pour le joueur ${playerName}.`);
        player.notifyEndGame();
        isStarted = false; // Réinitialiser l'état de la partie
    }

    /**
     * Réinitialise la partie solo
     */
    function resetGame() {
        console.log(`Réinitialisation de la partie solo pour la room ${roomName}.`);
        isStarted = false;
        pieceSequence.length = 0; // Vider la séquence des pièces
        player.reset();
    }

    // Retourne les fonctions et propriétés exposées par l'objet SoloGame
    return {
        roomName,
        player,
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
