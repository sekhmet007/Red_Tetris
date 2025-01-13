import createGame from '../src/models/Game';
import { describe, it, expect } from '@jest/globals';

describe('createGame', () => {
    it('should create a game with the correct players', () => {
        const game = createGame('roomName', [
            { id: '1', name: 'Player 1', socket: { id: '1' } },
            { id: '2', name: 'Player 2', socket: { id: '2' } },
        ]);

        expect(game.players).toEqual({
            '1': expect.objectContaining({ id: '1', name: 'Player 1', socket: expect.objectContaining({ id: '1' }) }),
            '2': expect.objectContaining({ id: '2', name: 'Player 2', socket: expect.objectContaining({ id: '2' }) }),
        });
    });

	it('should assign a leader when a player joins', () => {
		const game = createGame('roomName', [
			{ id: '1', name: 'Player 1', socket: { id: '1' } },
			{ id: '2', name: 'Player 2', socket: { id: '2' } },
		]);

		expect(game.leaderId).toBe('1');
		game.removePlayer('1');
		expect(game.leaderId).toBe('2');
	});

    it('should start the game when startGame is called', () => {
        const game = createGame('roomName', [
            { id: '1', name: 'Player 1', socket: { id: '1' } },
            { id: '2', name: 'Player 2', socket: { id: '2' } },
        ]);

        expect(game.isStarted).toBe(false);

        game.startGameMulti();

        expect(game.isStarted).toBe(true);
    });

    it('should not start the game when startGame is called if there are less than 2 players', () => {
        const game = createGame('roomName', [
            { id: '1', name: 'Player 1', socket: { id: '1' } },
        ]);

        expect(game.isStarted).toBe(false);

        game.startGame();

        expect(game.isStarted).toBe(false);
    });

    it('should handle line completion correctly', () => {
        const game = createGame('roomName', [
            { id: '1', name: 'Player 1', socket: { id: '1' } },
            { id: '2', name: 'Player 2', socket: { id: '2' } },
        ]);

        game.handleLineCompletion('1', 2);

        expect(game.players['1'].score).toEqual(300);
        expect(game.players['2'].score).toEqual(0);
    });
});
