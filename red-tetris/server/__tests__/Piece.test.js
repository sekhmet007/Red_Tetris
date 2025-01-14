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
        const maxAllowedIdentical = Math.ceil(shuffleAttempts * 0.2);
        expect(identicalShuffleCount).toBeLessThanOrEqual(maxAllowedIdentical);
    });

    it('should detect invalid shapes', () => {
        const invalidShapes = [
            {
                shape: 'X',
                rotationStates: [
                    [
                        [1, 1],
                        [1, 1, 1], // Longueur inégale
                    ],
                ],
            },
        ];

        const isValid = invalidShapes.every(({ rotationStates }) =>
            rotationStates.every((state) =>
                state.every((row) => row.length === rotationStates[0][0].length)
            )
        );

        expect(isValid).toBe(false);
    });

    it('should create a piece with specific shape and rotation states', () => {
        const piece = createPiece('T', shapes.find((s) => s.shape === 'T').rotationStates);

        expect(piece.shape).toBe('T');
        expect(piece.getCurrentShape()).toEqual(shapes.find((s) => s.shape === 'T').rotationStates[0]);

        // Vérifiez les rotations successives
        piece.rotate();
        expect(piece.getCurrentShape()).toEqual(shapes.find((s) => s.shape === 'T').rotationStates[1]);
    });

    it('should generate a unique sequence of pieces', () => {
        const sequence = generatePieceSequence(10);
        const uniqueIndices = new Set(sequence);
        expect(uniqueIndices.size).toBeGreaterThanOrEqual(7); // Au moins 7 formes uniques
    });

    it('should modify cloned piece independently', () => {
        const originalPiece = createPiece('I', shapes.find((s) => s.shape === 'I').rotationStates);
        const clonedPiece = originalPiece.clone();

        clonedPiece.rotate();
        expect(clonedPiece.getCurrentShape()).not.toEqual(originalPiece.getCurrentShape());
    });

    it('should validate inconsistent shapes', () => {
        const inconsistentShape = [
            {
                shape: 'Inconsistent',
                rotationStates: [
                    [
                        [1, 1],
                        [1, 1],
                    ],
                    [
                        [1, 1, 1], // Taille incohérente
                    ],
                ],
            },
        ];

        const isValid = validateShapes(inconsistentShape);
        expect(isValid).toBe(false);
    });

    it('should generate a random piece', () => {
        const piece = generatePiece();
        expect(piece).toHaveProperty('shape');
        expect(piece).toHaveProperty('rotationStates');
        expect(Array.isArray(piece.rotationStates)).toBe(true);
    });

    it('should handle invalid sequence length', () => {
        expect(() => generatePieceSequence(-1)).toThrow();
    });

    it('should throw an error for invalid rotation states', () => {
        expect(() =>
            createPiece('Invalid', [
                [
                    [1, 1],
                    [1],
                ],
            ])
        ).toThrow('Invalid shape detected');
    });
});

