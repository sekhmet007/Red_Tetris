// src/server/models/Piece.js
function createPiece(shape, rotationStates) {
	let currentRotation = 0;

	function rotate() {
		currentRotation = (currentRotation + 1) % rotationStates.length;
	}

	function getCurrentShape() {
		return rotationStates[currentRotation];
	}

	function clone() {
		return createPiece(shape, rotationStates);
	}

	return {
		shape,
		rotationStates,
		getCurrentShape,
		rotate,
		clone,
	};
}

function generatePieceSequence() {
	const shapes = [0, 1, 2, 3, 4, 5, 6]; // Les indices des formes
	const sequence = [];
	while (sequence.length < 100) {
	  const shuffled = shapes.sort(() => Math.random() - 0.5); // Mélange aléatoire
	  sequence.push(...shuffled);
	}
	return sequence.slice(0, 100);
  }
function generatePiece() {
	const shapes = [
		{ shape: 'I', rotationStates: [[
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
		]] },
		{ shape: 'J', rotationStates: [[
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
		]] },
		{ shape: 'L', rotationStates: [[
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
		]] },
		{ shape: 'O', rotationStates: [[
			[1, 1],
			[1, 1],
		]] },
		{ shape: 'S', rotationStates: [[
			[0, 1, 1],
			[1, 1, 0],
			[0, 0, 0],
		],
		[
			[0, 1, 0],
			[0, 1, 1],
			[0, 0, 1],
		]] },
		{ shape: 'T', rotationStates: [[
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
		]] },
		{ shape: 'Z', rotationStates: [[
			[1, 1, 0],
			[0, 1, 1],
			[0, 0, 0],
		],
		[
			[0, 0, 1],
			[0, 1, 1],
			[0, 1, 0],
		]] },
	];
	const randomIndex = Math.floor(Math.random() * shapes.length);
	const selectedShape = shapes[randomIndex];
	return createPiece(selectedShape.shape, selectedShape.rotationStates);
}

export default { createPiece, generatePiece };