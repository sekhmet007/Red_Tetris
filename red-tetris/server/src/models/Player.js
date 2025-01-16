import { v4 as uuidv4 } from 'uuid';

function createPlayer(name, socket, roomName) {
    const id = uuidv4();
    let score = 0;
    const terrain = Array.from({ length: 20 }, () => Array(10).fill(0));

    console.log(`Création du joueur ${name} (ID : ${id}) dans la room ${roomName}`);

    function setRoomName(newRoomName) {
        roomName = newRoomName;
    }
    function reset() {
        console.log(`Réinitialisation du terrain pour le joueur ${name} (ID : ${id})`);
        terrain.forEach(row => row.fill(0));
    }

    function updateScore(lines) {
        console.log(`Mise à jour du score pour le joueur ${name} (ID : ${id}), Lignes complétées : ${lines}`);
        const pointsParLignes = [0, 100, 300, 500, 800];
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

    function receivePenaltyLines(numLines) {
        console.log(`${name} reçoit ${numLines} lignes de pénalité`);

        if (numLines <= 0) {
            console.log('Pas de lignes de pénalité à appliquer');
            return;
        }

        // Créer un nouveau terrain avec les pénalités
        const newTerrain = [...terrain];

        // Supprimer les lignes du haut
        newTerrain.splice(0, numLines);

        // Ajouter les lignes de pénalité en bas
        for (let i = 0; i < numLines; i++) {
            newTerrain.push(Array(10).fill(-1));  // Ligne indestructible
        }

        // Mettre à jour le terrain
        terrain.length = 0;
        terrain.push(...newTerrain);

        // Notifier le client
        socket.emit('penaltyApplied', {
            lines: numLines,
            terrain: newTerrain
        });

        return terrain;
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
        receivePenaltyLines,
        setRoomName
    };
}

export default createPlayer;
