import { shapes, createPiece, generatePiece, generatePieceSequence, validateShapes, shuffleArray } from '../src/models/Piece';
import { describe, it, expect } from '@jest/globals';

describe('Piece Model', () => {
    it('should generate a piece with valid properties', () => {
        const piece = generatePiece();

        // Vérifiez que la pièce générée a les bonnes propriétés
        expect(piece).toHaveProperty('shape');
        expect(piece).toHaveProperty('rotationStates');
        expect(Array.isArray(piece.rotationStates)).toBe(true);

        // Vérifiez que la forme existe dans la liste des formes
        const validShapes = shapes.map(s => s.shape);
        expect(validShapes).toContain(piece.shape);
    });

    it('should generate a sequence of pieces', () => {
        const sequence = generatePieceSequence(10); // Generate a sequence of 10 pieces
        expect(sequence).toHaveLength(10);
        sequence.forEach(index => {
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(shapes.length);
        });
    });

    it('should clone a piece correctly', () => {
        const originalPiece = createPiece(shapes[0].shape, shapes[0].rotationStates);
        const clonedPiece = originalPiece.clone();

        // Vérifiez que les propriétés sont identiques
        expect(clonedPiece.shape).toEqual(originalPiece.shape);
        expect(clonedPiece.rotationStates).toEqual(originalPiece.rotationStates);

        // Assurez-vous que les objets ne partagent pas la même référence
        expect(clonedPiece.rotationStates).not.toBe(originalPiece.rotationStates);
    });

    it('should validate shapes correctly', () => {
        expect(() => {
            if (!validateShapes()) {
                throw new Error('Invalid shapes or rotations found.');
            }
        }).not.toThrow();
    });

    it('should rotate a piece correctly', () => {
        const piece = createPiece(shapes[0].shape, shapes[0].rotationStates);
        const initialShape = piece.getCurrentShape();
        piece.rotate();
        expect(piece.getCurrentShape()).not.toEqual(initialShape);
        piece.rotate();
        piece.rotate();
        piece.rotate();
        expect(piece.getCurrentShape()).toEqual(initialShape);
    });

    it('should shuffle an array correctly', () => {
        const originalArray = [1, 2, 3, 4, 5];
        const shuffleAttempts = 1000; // Augmenter les tentatives pour une meilleure statistique
        let identicalShuffleCount = 0;

        for (let i = 0; i < shuffleAttempts; i++) {
            const shuffledArray = shuffleArray([...originalArray]);

            // La longueur doit rester identique
            expect(shuffledArray).toHaveLength(originalArray.length);

            // Tous les éléments doivent être présents après le mélange
            expect(shuffledArray.sort()).toEqual(originalArray.sort());

            // Vérifiez si le tableau mélangé est identique à l'original
            if (JSON.stringify(shuffledArray) === JSON.stringify(originalArray)) {
                identicalShuffleCount++;
            }
        }

        // Ajustez le seuil à un pourcentage réaliste
        const maxAllowedIdentical = Math.ceil(shuffleAttempts * 0.1);
        expect(identicalShuffleCount).toBeLessThanOrEqual(maxAllowedIdentical);
    });
});

