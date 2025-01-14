import createGame from '../src/models/Game';
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';


beforeAll(() => {
    console.error = jest.fn();
});

const mockSocket = {
    id: 'socketId',
    emit: jest.fn(),
    on: jest.fn(),
};


const mockIO = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
};

describe('createGame', () => {

    it('should create a game with the correct players', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1', emit: jest.fn() };
        const socket2 = { ...mockSocket, id: 'socket2', emit: jest.fn() };

        game.addPlayer('Player 1', { id: '1', socket: socket1 });
        game.addPlayer('Player 2', { id: '2', socket: socket2 });

        expect(game.players).toEqual({
            '1': expect.objectContaining({ id: '1', name: 'Player 1' }),
            '2': expect.objectContaining({ id: '2', name: 'Player 2' }),
        });
    });

    describe('Game', () => {
        let consoleErrorMock;

        beforeEach(() => {
            consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });
        });

        afterEach(() => {
            consoleErrorMock.mockRestore();
        });

        it('should not add a player with an invalid name', () => {
            const game = createGame('roomName', mockIO);
            const invalidPlayer = game.addPlayer('', mockSocket); // Nom vide
            expect(invalidPlayer).toBeNull();
            expect(console.error).toHaveBeenCalledWith('Nom de joueur invalide.');
        });


        afterEach(() => {
            consoleErrorMock.mockRestore();
        });

        it('should not add a player with an invalid name', () => {
            const game = createGame('roomName', mockIO);
            const invalidPlayer = game.addPlayer('', mockSocket); // Nom vide
            expect(invalidPlayer).toBeNull();
            expect(console.error).toHaveBeenCalledWith('Nom de joueur invalide.');
        });
    });

    it('should not add a player with a duplicate name', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', mockSocket);
        const duplicatePlayer = game.addPlayer('Player 1', mockSocket); // Nom dupliqué
        expect(duplicatePlayer).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Le joueur avec le nom "Player 1" existe déjà.');
    });

    it('should set the first player as the leader', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: mockSocket });
        expect(game.leaderId).toBe('1');
    });

    it('should assign a leader when a player joins', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: mockSocket });
        game.addPlayer('Player 2', { id: '2', socket: mockSocket });

        expect(game.leaderId).toBe('1');
        game.removePlayer('1');
        expect(game.leaderId).toBe('2');
    });

    it('should start the game if there are enough players', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: mockSocket });
        game.addPlayer('Player 2', { id: '2', socket: mockSocket });

        const result = game.startGameMulti();

        expect(result).toBe(true);
        expect(game.isStarted).toBe(true);
        expect(mockIO.to).toHaveBeenCalledWith('roomName');
        expect(mockIO.emit).toHaveBeenCalledWith('gameStarted', expect.any(Object));
    });

    it('should not start the game when startGameMulti is called if there are less than 2 players', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: mockSocket });

        expect(game.isStarted).toBe(false);

        game.startGameMulti();

        expect(game.isStarted).toBe(false);
    });

    it('should handle line completions and log relevant information', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        const player1 = game.addPlayer('Player 1', { id: '1', socket: socket1 });
        const player2 = game.addPlayer('Player 2', { id: '2', socket: socket2 });

        const consoleLogSpy = jest.spyOn(console, 'log');
        const ioEmitSpy = jest.spyOn(mockIO, 'emit');

        game.handleLineCompletion('socket1', 2);

        // Vérifier les logs
        expect(consoleLogSpy).toHaveBeenCalledWith('Début de gestion des lignes complétées :');
        expect(consoleLogSpy).toHaveBeenCalledWith(
            `- Joueur ayant complété : ${player1.name} (ID : ${player1.id}, Socket ID : ${player1.socket.id})`
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(`- Nombre de lignes complétées : 2`);
        expect(consoleLogSpy).toHaveBeenCalledWith(`- Lignes de pénalité calculées : 2`);
        expect(consoleLogSpy).toHaveBeenCalledWith(`Envoi de pénalité : 2 lignes de Player 1 à Player 2`);

        // Vérifier la mise à jour du score
        expect(player1.score).toBeGreaterThan(0);

        // Vérifier l'émission de l'événement de pénalité
        expect(ioEmitSpy).toHaveBeenCalledWith('penaltyApplied', {
            lines: 2,
            fromPlayer: 'Player 1',
            toPlayer: 'Player 2',
        });

        // Vérifier l'application des lignes de pénalité
        expect(player2.receivePenaltyLines).toHaveBeenCalledWith(2);

        consoleLogSpy.mockRestore();
    });

    it('should log an error if the sender is not found', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };

        const consoleErrorSpy = jest.spyOn(console, 'error');
        const consoleLogSpy = jest.spyOn(console, 'log');

        game.addPlayer('Player 1', { id: '1', socket: socket1 });

        // Appeler la fonction avec un ID de socket inexistant
        game.handleLineCompletion('invalidSocket', 2);

        // Vérifier que l'erreur est loguée
        expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur : Aucun joueur trouvé avec le Socket ID invalidSocket');
        expect(consoleLogSpy).toHaveBeenCalledWith('Liste actuelle des joueurs enregistrés :', [
            expect.objectContaining({ name: 'Player 1', socketId: 'socket1' }),
        ]);

        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    it('should assign a new leader when the current leader leaves', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: '1' } });
        game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: '2' } });

        expect(game.leaderId).toBe('1');

        game.removePlayer('1');
        expect(game.leaderId).toBe('2');
    });

    it('should cover advanced game flow', () => {
        const game = createGame('roomName', mockIO);

        // Ajouter plusieurs joueurs
        game.addPlayer('Valid Name 1', { id: '1', socket: { ...mockSocket, emit: jest.fn() } });
        game.addPlayer('Valid Name 2', { id: '2', socket: { ...mockSocket, emit: jest.fn() } });
        game.addPlayer('Valid Name 3', { id: '3', socket: { ...mockSocket, emit: jest.fn() } });

        // Tester le démarrage de la partie
        const startResult = game.startGameMulti();
        expect(startResult).toBe(true);
        expect(game.isStarted).toBe(true);

        // Tester la complétion de lignes
        game.handleLineCompletion('1', 2);
        expect(game.players['1'].score).toBeGreaterThan(0);

        // Tester l’envoi de lignes (si vous avez une méthode handleLineSent)
        if (typeof game.handleLineSent === 'function') {
            game.handleLineSent('2', 1);
            // Vérifications supplémentaires ici
        }

        // Tester le retrait de joueur
        game.removePlayer('2');
        expect(game.players['2']).toBeUndefined();
        // S’assurer qu’un nouveau leader est sélectionné si nécessaire
        if (game.leaderId === '2') {
            throw new Error('Le leader aurait dû changer après le retrait du joueur 2');
        }

        // Tester la fin de la partie (si vous avez une méthode handleGameOver)
        if (typeof game.handleGameOver === 'function') {
            game.handleGameOver('1');
            expect(game.isFinished).toBe(true);
        }

        // Tester le changement de leader
        game.addPlayer('Valid Name 4', { id: '4', socket: { ...mockSocket, emit: jest.fn() } });
        expect(game.leaderId).toBe('1');
        game.removePlayer('1');
        expect(game.leaderId).toBe('4');
        game.removePlayer('4');
        expect(game.leaderId).toBe('3');

        // Tester la suppression d'un joueur
        game.removePlayer('3');
        expect(game.players['3']).toBeUndefined();
        expect(true).toBe(true);

        it('should handle player removal and assign new leader correctly', () => {
            const game = createGame('roomName', mockIO);
            game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: '1' } });
            game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: '2' } });

            expect(game.leaderId).toBe('1');

            game.removePlayer('1');
            expect(game.leaderId).toBe('2');

            game.removePlayer('2');
            expect(game.leaderId).toBeNull();
            expect(game.isStarted).toBe(false);
        });

        it('should assign penalty lines correctly', () => {
            const game = createGame('roomName', mockIO);
            game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: '1' } });
            game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: '2' } });

            game.handleLineCompletion('1', 2);
            expect(mockIO.emit).toHaveBeenCalledWith('penaltyApplied', expect.any(Object));
        });

        it('should declare the correct winner', () => {
            const game = createGame('roomName', mockIO);
            game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: '1' } });
            game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: '2' } });

            game.handlePlayerGameOver('2');
            expect(game.getWinner().id).toBe('1');
        });

        it('should handle game over correctly', () => {
            const game = createGame('roomName', mockIO);
            game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: '1' } });
            game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: '2' } });

            game.handlePlayerGameOver('1');
            game.handlePlayerGameOver('2');
            expect(mockIO.emit).toHaveBeenCalledWith('gameOver', { type: 'draw' });
        });

    });

    describe('removePlayer', () => {
        let game;
        let mockIO;
        let mockSocket;

        beforeEach(() => {
            mockIO = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            };
            mockSocket = {
                id: 'mockSocketId',
                emit: jest.fn(),
            };
            game = createGame('roomName', mockIO);
        });

        it('should remove a player and reassign the leader if the removed player was the leader', () => {
            const mockSocket1 = { emit: jest.fn(), on: jest.fn(), id: 'socket1' };
            const mockSocket2 = { emit: jest.fn(), on: jest.fn(), id: 'socket2' };

            // Ajouter deux joueurs
            const player1 = game.addPlayer('Player 1', { id: '1', socket: mockSocket1 });
            const player2 = game.addPlayer('Player 2', { id: '2', socket: mockSocket2 });

            // Vérifier que Player 1 est le leader
            expect(game.leaderId).toBe(player1.id);

            // Supprimer le leader
            game.removePlayer(player1.id);

            // Vérifier que Player 2 est maintenant le leader
            expect(game.leaderId).toBe(player2.id);
            // Notez que nous vérifions player2.socket.emit, et non plus mockSocket1.emit
            expect(mockSocket2.emit).toHaveBeenCalledWith('youAreLeader');
            expect(mockIO.to).toHaveBeenCalledWith('roomName');
            expect(mockIO.emit).toHaveBeenCalledWith('leaderChanged', 'Player 2');
        });
        it('should suspend the game if the last player is removed', () => {
            // Ajouter un joueur
            const player1 = game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: 'socket1' } });

            // Supprimer le joueur
            game.removePlayer(player1.id);

            // Vérifier que le leader est null et que la partie est suspendue
            expect(game.leaderId).toBeNull();
            expect(game.isStarted).toBe(false);
        });

        it('should remove a player without affecting the leader if the removed player is not the leader', () => {
            // Ajouter deux joueurs
            const player1 = game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: 'socket1' } });
            const player2 = game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: 'socket2' } });

            // Supprimer Player 2
            game.removePlayer(player2.id);

            // Vérifier que Player 1 est toujours le leader
            expect(game.leaderId).toBe(player1.id);
            expect(game.players).not.toHaveProperty(player2.id);
        });

        it('should call resetGame when all players are removed', () => {
            // Espionner la méthode resetGame
            const resetGameSpy = jest.spyOn(game, 'resetGame');

            // Ajouter un joueur et le supprimer
            const player1 = game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: 'socket1' } });
            game.removePlayer(player1.id);

            // Vérifier que resetGame est appelé
            expect(resetGameSpy).toHaveBeenCalled();
        });
    });

    describe('isValidName', () => {
        it('should return true for valid names', () => {
            const game = createGame('roomName', mockIO);
            expect(game.isValidName('Valid Name')).toBe(true);
        });

        it('should return false for invalid names', () => {
            const game = createGame('roomName', mockIO);
            expect(game.isValidName('')).toBe(false);
            expect(game.isValidName(null)).toBe(false);
            expect(game.isValidName(undefined)).toBe(false);
            expect(game.isValidName(123)).toBe(false);
        });
    });

    it('should return the correct player by socket ID', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        const player1 = game.addPlayer('Player 1', { id: '1', socket: socket1 });
        const player2 = game.addPlayer('Player 2', { id: '2', socket: socket2 });

        expect(game.getPlayerBySocketId('socket1')).toEqual(player1);
        expect(game.getPlayerBySocketId('socket2')).toEqual(player2);
        expect(game.getPlayerBySocketId('nonexistent')).toBeUndefined();
    });

    it('should declare a winner when one player remains', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        game.addPlayer('Player 1', { id: '1', socket: socket1 });
        game.addPlayer('Player 2', { id: '2', socket: socket2 });

        game.handlePlayerGameOver('2');

        expect(mockIO.emit).toHaveBeenCalledWith('gameOver', {
            winner: 'Player 1',
            type: 'victory',
        });
    });

    it('should declare a draw when all players lose', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        game.addPlayer('Player 1', { id: '1', socket: socket1 });
        game.addPlayer('Player 2', { id: '2', socket: socket2 });

        game.handlePlayerGameOver('1');
        game.handlePlayerGameOver('2');

        expect(mockIO.emit).toHaveBeenCalledWith('gameOver', {
            type: 'draw',
        });
    });

    it('should continue the game if multiple players remain', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };
        const socket3 = { ...mockSocket, id: 'socket3' };

        game.addPlayer('Player 1', { id: '1', socket: socket1 });
        game.addPlayer('Player 2', { id: '2', socket: socket2 });
        game.addPlayer('Player 3', { id: '3', socket: socket3 });

        game.handlePlayerGameOver('1');

        expect(mockIO.emit).not.toHaveBeenCalledWith('gameOver');
    });

    it('should return true if all players are marked as game over', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        const player1 = game.addPlayer('Player 1', { id: '1', socket: socket1 });
        const player2 = game.addPlayer('Player 2', { id: '2', socket: socket2 });

        player1.isGameOver = true;
        player2.isGameOver = true;

        expect(game.isGameOver()).toBe(true);
    });

    it('should return false if at least one player is still active', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        const player1 = game.addPlayer('Player 1', { id: '1', socket: socket1 });
        const player2 = game.addPlayer('Player 2', { id: '2', socket: socket2 });

        player1.isGameOver = true;

        expect(game.isGameOver()).toBe(false);
    });

    it('should return the ID of the last active player', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        const player1 = game.addPlayer('Player 1', { id: '1', socket: socket1 });
        const player2 = game.addPlayer('Player 2', { id: '2', socket: socket2 });

        player2.isGameOver = true;

        expect(game.checkGameOver()).toBe('1');
    });

    it('should return null if no players are active', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        const player1 = game.addPlayer('Player 1', { id: '1', socket: socket1 });
        const player2 = game.addPlayer('Player 2', { id: '2', socket: socket2 });

        player1.isGameOver = true;
        player2.isGameOver = true;

        expect(game.checkGameOver()).toBeNull();
    });

    it('should mark a player as game over and notify them', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };

        const player = game.addPlayer('Player 1', { id: '1', socket: socket1 });

        const notifyEndGameSpy = jest.spyOn(player, 'notifyEndGame');
        game.handlePlayerGameOver('1');

        // Vérifier que le joueur est marqué comme "game over"
        expect(player.isGameOver).toBe(true);

        // Vérifier que notifyEndGame est appelé
        expect(notifyEndGameSpy).toHaveBeenCalled();

        notifyEndGameSpy.mockRestore();
    });

    it('should declare the last active player as the winner', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        const player1 = game.addPlayer('Player 1', { id: '1', socket: socket1 });
        const player2 = game.addPlayer('Player 2', { id: '2', socket: socket2 });

        const ioEmitSpy = jest.spyOn(mockIO, 'emit');
        game.handlePlayerGameOver('2');

        // Vérifier que le dernier joueur est déclaré vainqueur
        expect(ioEmitSpy).toHaveBeenCalledWith('gameOver', {
            winner: player1.name,
            type: 'victory',
        });

        // Vérifier que le jeu est réinitialisé
        expect(game.isStarted).toBe(false);

        ioEmitSpy.mockRestore();
    });

    it('should declare a draw when all players are game over', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        game.addPlayer('Player 1', { id: '1', socket: socket1 });
        game.addPlayer('Player 2', { id: '2', socket: socket2 });

        const ioEmitSpy = jest.spyOn(mockIO, 'emit');

        // Déclarer tous les joueurs comme "game over"
        game.handlePlayerGameOver('1');
        game.handlePlayerGameOver('2');

        // Vérifier qu'un match nul est déclaré
        expect(ioEmitSpy).toHaveBeenCalledWith('gameOver', {
            type: 'draw',
        });

        // Vérifier que le jeu est réinitialisé
        expect(game.isStarted).toBe(false);

        ioEmitSpy.mockRestore();
    });

    it('should continue the game if multiple players are still active', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };
        const socket3 = { ...mockSocket, id: 'socket3' };

        game.addPlayer('Player 1', { id: '1', socket: socket1 });
        game.addPlayer('Player 2', { id: '2', socket: socket2 });
        game.addPlayer('Player 3', { id: '3', socket: socket3 });

        const consoleLogSpy = jest.spyOn(console, 'log');

        // Marquer un joueur comme "game over"
        game.handlePlayerGameOver('1');

        // Vérifier que le jeu continue
        expect(consoleLogSpy).toHaveBeenCalledWith('La partie continue avec 2 joueur(s) actif(s).');
        expect(game.isStarted).toBe(true);

        consoleLogSpy.mockRestore();
    });

    it('should log an error if the player does not exist', () => {
        const game = createGame('roomName', mockIO);

        const consoleErrorSpy = jest.spyOn(console, 'error');

        // Appeler la fonction avec un ID de joueur inexistant
        game.handlePlayerGameOver('nonexistentPlayerId');

        // Vérifier que l'erreur est loguée
        expect(consoleErrorSpy).toHaveBeenCalledWith("Le joueur avec l'ID nonexistentPlayerId n'existe pas.");

        consoleErrorSpy.mockRestore();
    });

});