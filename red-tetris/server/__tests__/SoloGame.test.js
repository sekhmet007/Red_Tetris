import { describe, it, expect, jest } from '@jest/globals';
import createSoloGame  from '../src/models/SoloGame';

describe('createSoloGame', () => {
    it('should create a solo game with the correct players', () => {
        const playerName = 'Player 1';
        const roomName = 'room1';
        const socket = { emit: jest.fn() };
        const soloGame = createSoloGame(roomName, playerName, socket);

        expect(soloGame.player.name).toEqual(playerName);
        expect(soloGame.roomName).toEqual(roomName);
        expect(soloGame.mode).toEqual('solo');
        expect(soloGame.pieceSequence).toEqual([]);
        expect(soloGame.isStarted).toEqual(false);
    });

    it('should start the solo game when startGame is called', () => {
        const playerName = 'Player 1';
        const roomName = 'room1';
        const socket = { emit: jest.fn() };
        const soloGame = createSoloGame(roomName, playerName, socket);

        soloGame.startGame();

        expect(soloGame.isStarted).toEqual(true);
        expect(soloGame.pieceSequence.length).toEqual(100);
        expect(socket.emit).toHaveBeenCalledWith('gameStarted', {
            pieces: soloGame.pieceSequence,
            initialGrid: expect.anything(),
        });
    });

    it('should not start the solo game when startGame is called if it is already started', () => {
        const playerName = 'Player 1';
        const roomName = 'room1';
        const socket = { emit: jest.fn() };
        const soloGame = createSoloGame(roomName, playerName, socket);

        soloGame.startGame();
        soloGame.startGame();

        expect(soloGame.isStarted).toEqual(true);
        expect(socket.emit).toHaveBeenCalledTimes(1);
    });

    it('should handle line completion correctly', () => {
        const playerName = 'Player 1';
        const roomName = 'room1';
        const socket = { emit: jest.fn() };
        const soloGame = createSoloGame(roomName, playerName, socket);

        soloGame.startGame();
        soloGame.handleLineCompletion(2);

        expect(soloGame.player.score).toEqual(300);
    });

    it('should handle game over correctly', () => {
        const playerName = 'Player 1';
        const roomName = 'room1';
        const socket = { emit: jest.fn() };
        const soloGame = createSoloGame(roomName, playerName, socket);

        soloGame.startGame();
        soloGame.handleGameOver();

        expect(soloGame.isStarted).toEqual(false);
        expect(socket.emit).toHaveBeenCalledWith('gameOver');
    });

	it('should reset the solo game correctly', () => {
		const socket = { emit: jest.fn() };
		const soloGame = createSoloGame('room1', 'Player 1', socket);

		soloGame.startGame();
		soloGame.resetGame();

		expect(soloGame.isStarted).toBe(false);
		expect(soloGame.pieceSequence).toEqual([]);
	});
});
