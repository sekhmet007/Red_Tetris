import { shapes, createPiece, generatePiece, generatePieceSequence, validateShapes } from '../src/models/Piece';
import { describe, it, expect } from '@jest/globals';

describe('Piece Model', () => {
    it('should generate a valid piece', () => {
        const piece = generatePiece();
        expect(piece).toHaveProperty('shape');
        expect(piece).toHaveProperty('rotationStates');
        expect(Array.isArray(piece.rotationStates)).toBe(true);
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
        expect(clonedPiece).toEqual(originalPiece);
        expect(clonedPiece).not.toBe(originalPiece); // Ensure it's a new object
    });

    it('should validate shapes correctly', () => {
        expect(() => {
            if (!validateShapes()) {
                throw new Error('Invalid shapes or rotations found.');
            }
        }).not.toThrow();
    });
});

