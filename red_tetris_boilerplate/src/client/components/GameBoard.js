// components/GameBoard.js
import React from 'react';

// Dimensions du plateau de jeu
const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 40; // Taille des cellules en pixels

const GameBoard = ({ grid }) => {
  return (
    <div style={styles.board}>
      {grid.map((row, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {row.map((cell, colIndex) => (
            <div
              key={colIndex}
              style={{
                ...styles.cell,
                backgroundColor: cell.shape ? `rgba(${cell.color}, 0.8)` : 'white',
              }}
            ></div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

const styles = {
  board: {
    display: 'grid',
    gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`, // 20 lignes de CELL_SIZE px
    gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`, // 10 colonnes de CELL_SIZE px
    border: '2px solid black',
    width: `${COLS * CELL_SIZE}px`, // Calculer la largeur du plateau
    height: `${ROWS * CELL_SIZE}px`, // Calculer la hauteur du plateau
    margin: '20px auto', // Centrer horizontalement
  },
  cell: {
    width: `${CELL_SIZE}px`,
    height: `${CELL_SIZE}px`,
    border: '1px solid #ccc',
  },
};

export default GameBoard;
