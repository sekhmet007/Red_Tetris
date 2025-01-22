import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import TetrisGame from '../src/TetrisGame';
import io from 'socket.io-client';
import styles from './mock.css';
console.log(styles);
// Mock du module socket.io-client
jest.mock('socket.io-client', () => {
	return {
		__esModule: true,
		default: jest.fn(() => ({
			emit: jest.fn(),
			on: jest.fn(),
			off: jest.fn(),
		})),
	};
});

describe('TetrisGame Component', () => {
	let mockSocket;

	beforeEach(() => {
		mockSocket = io();
		jest.clearAllMocks();
	});

	test('should render mode selection buttons', () => {
		render(<TetrisGame />);
		expect(screen.getByText('Mode Solo')).toBeInTheDocument();
		expect(screen.getByText('Mode Multijoueur')).toBeInTheDocument();
	});

	test('should start solo game when Mode Solo button is clicked', async () => {
		render(<TetrisGame />);

		const soloButton = screen.getByText('Mode Solo');
		fireEvent.click(soloButton);

		await waitFor(() => {
			expect(mockSocket.emit).toHaveBeenCalledWith('startGame', expect.any(Object), expect.any(Function));
		});

		expect(screen.getByText('Score:')).toBeInTheDocument();
	});

	test('should handle starting a multiplayer game', async () => {
		render(<TetrisGame />);

		const multiplayerButton = screen.getByText('Mode Multijoueur');
		fireEvent.click(multiplayerButton);

		await waitFor(() => {
			expect(mockSocket.emit).toHaveBeenCalledWith('joinRoom', expect.any(Object));
		});
	});

	test('should render the grid correctly', () => {
		render(<TetrisGame />);

		const cells = screen.getAllByRole('gridcell');
		expect(cells).toHaveLength(10 * 20); // LARGEUR_GRILLE * HAUTEUR_GRILLE
	});

	test('should handle piece movements with arrow keys', () => {
		render(<TetrisGame />);

		// Simule un mouvement à gauche
		fireEvent.keyDown(window, { key: 'ArrowLeft' });
		fireEvent.keyUp(window, { key: 'ArrowLeft' });

		// Simule un mouvement à droite
		fireEvent.keyDown(window, { key: 'ArrowRight' });
		fireEvent.keyUp(window, { key: 'ArrowRight' });

		// Simule une rotation
		fireEvent.keyDown(window, { key: 'ArrowUp' });
		fireEvent.keyUp(window, { key: 'ArrowUp' });

		// Simule une chute rapide
		fireEvent.keyDown(window, { key: 'ArrowDown' });
		fireEvent.keyUp(window, { key: 'ArrowDown' });

		// Vérification : appels simulés des fonctions
		expect(mockSocket.emit).not.toHaveBeenCalled(); // Les mouvements locaux ne déclenchent pas d'événements socket par défaut
	});

	test('should reset the game when reset button is clicked', () => {
		render(<TetrisGame />);

		const resetButton = screen.getByText('Accueil');
		fireEvent.click(resetButton);

		expect(mockSocket.emit).toHaveBeenCalledWith('restartGame', expect.any(Object));
	});

	test('should handle game over state', async () => {
		render(<TetrisGame />);

		await waitFor(() => {
			mockSocket.emit('gameOver', { winner: 'Player 1', type: 'victory' });
		});

		expect(screen.getByText('🏆 Félicitations ! Vous avez gagné ! 🏆')).toBeInTheDocument();
	});
});