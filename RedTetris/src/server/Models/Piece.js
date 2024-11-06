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