import { v4 as uuidv4 } from 'uuid';

function createPlayer(name, socket, roomName, isSoloMode = false) {
    const id = uuidv4();
    let score = 0;
    const terrain = Array.from({ length: 20 }, () => Array(10).fill(0));

    console.log(`Création du joueur ${name} (ID : ${id}) dans la room ${roomName}`);

    function reset() {
        console.log(`Réinitialisation du terrain pour le joueur ${name} (ID : ${id})`);
        terrain.forEach(row => row.fill(0));
    }

    function updateScore(lines) {
        console.log(`Mise à jour du score pour le joueur ${name} (ID : ${id}), Lignes complétées : ${lines}`);
        const pointsParLignes = [0, 40, 100, 300, 1200];
        score += pointsParLignes[lines];
        console.log(`Nouveau score pour le joueur ${name} : ${score}`);
        socket.emit('scoreUpdated', score);
    }

    function sendPieceSequence(sequence) {
        console.log(`Envoi de la séquence de pièces au joueur ${name} (ID : ${id})`);
        if (!sequence || sequence.length === 0) {
            console.error('Erreur : Séquence de pièces vide ou invalide.');
            return false;
        }
        socket.emit('pieceSequence', sequence);
        return true;
    }

    function notifyEndGame() {
        console.log(`Notification de fin de partie pour le joueur ${name} (ID : ${id})`);
        socket.emit('gameOver');
    }

    return {
        id,
        name,
        socket,
        terrain,
        score,
        roomName,
        reset,
        updateScore,
        sendPieceSequence,
        notifyEndGame,
    };
}

export default createPlayer;
