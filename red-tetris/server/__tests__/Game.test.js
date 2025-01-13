import createGame from '../src/models/Game';
import { describe, it, expect, jest } from '@jest/globals';

const mockSocket = {
    id: 'socketId',
    emit: jest.fn(),
};

const mockIO = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
};

describe('createGame', () => {
    it('should create a game with the correct players', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: { ...mockSocket, id: '1' } });
        game.addPlayer('Player 2', { id: '2', socket: { ...mockSocket, id: '2' } });

        expect(game.players).toEqual({
            '1': expect.objectContaining({ id: '1', name: 'Player 1', socket: expect.objectContaining({ id: '1' }) }),
            '2': expect.objectContaining({ id: '2', name: 'Player 2', socket: expect.objectContaining({ id: '2' }) }),
        });
    });

    it('should not add a player with an invalid name', () => {
        const game = createGame('roomName', mockIO);
        const invalidPlayer = game.addPlayer('', { id: '1', socket: mockSocket });
    
        expect(invalidPlayer).toBeNull();
        expect(mockIO.emit).not.toHaveBeenCalled();
    });

    it('should not add a player with a duplicate name', () => {
        const game = createGame('roomName', mockIO);
        game.addPlayer('Player 1', { id: '1', socket: mockSocket });
    
        const duplicatePlayer = game.addPlayer('Player 1', { id: '2', socket: mockSocket });
    
        expect(duplicatePlayer).toBeNull();
        expect(Object.keys(game.players)).toHaveLength(1);
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
});