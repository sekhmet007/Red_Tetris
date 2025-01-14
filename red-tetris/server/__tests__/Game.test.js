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

    it('should correctly handle line completions', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: mockSocket });
        game.addPlayer('Player 2', { id: '2', socket: mockSocket });

        game.handleLineCompletion('1', 2);
        expect(game.players['1'].score).toBeGreaterThan(0);
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
            // Ajouter deux joueurs
            const player1 = game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: 'socket1' } });
            const player2 = game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: 'socket2' } });

            // Vérifier que Player 1 est le leader
            expect(game.leaderId).toBe(player1.id);

            // Supprimer le leader
            game.removePlayer(player1.id);

            // Vérifier que Player 2 est maintenant le leader
            expect(game.leaderId).toBe(player2.id);
            expect(mockSocket.emit).toHaveBeenCalledWith('youAreLeader');
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

});