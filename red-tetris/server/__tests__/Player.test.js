import { describe, it, expect, jest } from '@jest/globals';
import createPlayer from '../src/models/Player';

describe('Player Model', () => {
	it('should create a player with the correct properties', () => {
		const name = 'Player 1';
		const socket = { id: '1', emit: jest.fn() };
		const roomName = 'room1';
		const player = createPlayer(name, socket, roomName);

		expect(player).toHaveProperty('id');
		expect(player).toHaveProperty('name', name);
		expect(player).toHaveProperty('socket', socket);
		expect(player).toHaveProperty('score', 0);
		expect(player).toHaveProperty('terrain');
		expect(player).toHaveProperty('reset');
		expect(player).toHaveProperty('updateScore');
		expect(player).toHaveProperty('notifyEndGame');
	});

	it('should reset the player terrain correctly', () => {
		const name = 'Player 1';
		const socket = { id: '1', emit: jest.fn() };
		const roomName = 'room1';
		const player = createPlayer(name, socket, roomName);

		player.reset();

		expect(player.terrain).toEqual(expect.arrayContaining([
			expect.arrayContaining([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
		]));
	});

	it('should update the player score correctly', () => {
		const name = 'Player 1';
		const socket = { id: '1', emit: jest.fn() };
		const roomName = 'room1';
		const player = createPlayer(name, socket, roomName);

		player.updateScore(1);

		expect(player.score).toEqual(100);
	});

	it('should send a valid piece sequence to the player', () => {
		const socket = { id: '1', emit: jest.fn() };
		const player = createPlayer('Player 1', socket, 'room1');
		const sequence = [1, 2, 3, 4];

		const result = player.sendPieceSequence(sequence);

		expect(socket.emit).toHaveBeenCalledWith('pieceSequence', sequence);
		expect(result).toBe(true);
	});

	it('should handle an invalid piece sequence gracefully', () => {
		const socket = { id: '1', emit: jest.fn() };
		const player = createPlayer('Player 1', socket, 'room1');

		const result = player.sendPieceSequence([]);

		expect(socket.emit).not.toHaveBeenCalled();
		expect(result).toBe(false);
	});

	it('should apply penalty lines correctly', () => {
		const socket = { id: '1', emit: jest.fn() };
		const player = createPlayer('Player 1', socket, 'room1');
		player.receivePenaltyLines(2);

		expect(player.terrain.slice(-2)).toEqual([
			Array(10).fill(-1),
			Array(10).fill(-1),
		]);
		expect(socket.emit).toHaveBeenCalledWith('penaltyApplied', expect.any(Object));
	});

	it('should handle invalid penalty lines gracefully', () => {
		const socket = { id: '1', emit: jest.fn() };
		const player = createPlayer('Player 1', socket, 'room1');
		player.receivePenaltyLines(0);

		expect(player.terrain).not.toContainEqual(Array(10).fill(-1)); // Pas de ligne ajoutée
		expect(socket.emit).not.toHaveBeenCalledWith('penaltyApplied', expect.any(Object));
	});

	it('should notify the player of the end of the game correctly', () => {
		const name = 'Player 1';
		const socket = { id: '1', emit: jest.fn() };
		const roomName = 'room1';
		const player = createPlayer(name, socket, roomName);

		player.notifyEndGame();

		expect(socket.emit).toHaveBeenCalledWith('gameOver');
	});
});
