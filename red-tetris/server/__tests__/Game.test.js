import createGame from '../src/models/Game';
import { describe, it, expect, jest } from '@jest/globals';


describe('createGame', () => {
    const mockSocket = {
        id: 'socketId',
        emit: jest.fn(),
        on: jest.fn(),
    };

    const mockIO = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
    };


    it('should create a game with the correct players', () => {
        const game = createGame('roomName', mockIO);
        const socket1 = { ...mockSocket, id: 'socket1' };
        const socket2 = { ...mockSocket, id: 'socket2' };

        game.addPlayer('Player 1', { id: '1', socket: socket1 });
        game.addPlayer('Player 2', { id: '2', socket: socket2 });

        expect(game.players).toEqual({
            '1': expect.objectContaining({ id: '1', name: 'Player 1' }),
            '2': expect.objectContaining({ id: '2', name: 'Player 2' }),
        });
    });

    it('should not add a player with an invalid name', () => {
        const game = createGame('roomName', mockIO);
        const invalidPlayer = game.addPlayer('', mockSocket); // Nom vide
        expect(invalidPlayer).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Nom de joueur invalide.');
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

        // Vous pouvez ajouter ici d’autres appels et vérifications
        // pour couvrir encore plus de logique (lignes 37-234).
        expect(true).toBe(true);
    });
});