// src/server/models/Piece.js

const shapes = [
  {
    shape: 'I',
    rotationStates: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
  },
  {
    shape: 'J',
    rotationStates: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
  },
  {
    shape: 'L',
    rotationStates: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  {
    shape: 'O',
    rotationStates: [
      [
        [1, 1],
        [1, 1],
      ],
    ],
  },
  {
    shape: 'S',
    rotationStates: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
    ],
  },
  {
    shape: 'T',
    rotationStates: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  {
    shape: 'Z',
    rotationStates: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
    ],
  },
];

function validateShapes(shapes) {
  if (!Array.isArray(shapes)) {
    throw new TypeError('The shapes parameter must be an array.');
  }
  return shapes.every(({ rotationStates }) =>
    rotationStates.every((state) =>
      state.every((row) => row.length === rotationStates[0][0].length)
    )
  );
}

function createPiece(shape, rotationStates) {
  if (!validateShapes(([ { shape, rotationStates } ]))) {
    throw new Error('Invalid shape detected');
  }
  let currentRotation = 0;

  function rotate() {
    currentRotation = (currentRotation + 1) % rotationStates.length;
  }

  function getCurrentShape() {
    return rotationStates[currentRotation];
  }

  function clone() {
      return createPiece(shape, JSON.parse(JSON.stringify(rotationStates)));
  }


  return {
    shape,
    rotationStates,
    getCurrentShape,
    rotate,
    clone,
  };
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generatePieceSequence(length = 100) {
  if (length < 0) {
    throw new Error('Length must be a positive integer');
  }
  const sequence = [];
  while (sequence.length < length) {
    sequence.push(...shuffleArray(Array.from({ length: shapes.length }, (_, i) => i)));
  }
  return sequence.slice(0, length);
}

function generatePiece() {
  const randomIndex = Math.floor(Math.random() * shapes.length);
  const selectedShape = shapes[randomIndex];
  return createPiece(selectedShape.shape, selectedShape.rotationStates);
}

export { shapes, createPiece, generatePiece, generatePieceSequence, validateShapes, shuffleArray };
