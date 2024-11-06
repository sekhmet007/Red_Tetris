//src/client/red-tetris/src/TetrisGame.js
import React, { useState, useEffect, useCallback } from "react";
import "./TetrisGame.css";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

const LARGEUR_GRILLE = 10;
const HAUTEUR_GRILLE = 20;
const X_INITIAL = 3;
const Y_INITIAL = 0;

const formes = [
  // Forme I
  [
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
  // Forme J
  [
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
  // Forme L
  [
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
  // Forme O
  [
    [
      [1, 1],
      [1, 1],
    ],
  ],
  // Forme S
  [
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
  // Forme T
  [
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
  // Forme Z
  [
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
];

const pointsParLignes = [0, 40, 100, 300, 1200];

function TetrisGame() {
  const [grille, setGrille] = useState(
    Array.from({ length: HAUTEUR_GRILLE }, () => Array(LARGEUR_GRILLE).fill(0))
  );
  const [formX, setFormX] = useState(X_INITIAL);
  const [formY, setFormY] = useState(Y_INITIAL);
  const [numForme, setNumForme] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [score, setScore] = useState(0);
  const [delay, setDelay] = useState(250);
  const [gameOver, setGameOver] = useState(false);
  const [fastDrop, setFastDrop] = useState(false);
  const [mode, setMode] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState(null);
  const [isReadyToStart, setIsReadyToStart] = useState(false);


  // Récupérer room et playerName à partir de l'URL
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room") || "defaultRoom";
  const playerName = params.get("playerName") || `Player_${socket.id}`;


  useEffect(() => {
    if (!mode) return;

    if (mode === "multiplayer") {
      // Envoie les informations de salle et de nom de joueur au serveur
      socket.emit("joinRoom", { room, playerName });

      socket.on("waitingForPlayer", (message) => {
        setWaitingMessage(message);
      });

      socket.on("leaderAssigned", (isLeaderStatus) => {
        setIsLeader(isLeaderStatus); // Le serveur renvoie si le joueur est le leader
        if (isLeaderStatus) setWaitingMessage("En attente d'un autre joueur...");
      });

      socket.on("readyToStart", () => {
        setIsReadyToStart(true);
        setWaitingMessage(null); // Supprimer le message d'attente une fois prêt
      });

      socket.on("gameStarted", ({ pieces }) => {
        setNumForme(pieces[0]);
        setScore(0);
        setGameOver(false);
        setWaitingMessage(null);
        setIsReadyToStart(false);
      });

      socket.on("penaltyApplied", ({ lines }) => {
        const newGrille = [...grille];
        for (let i = 0; i < lines; i++) {
          newGrille.shift();
          newGrille.push(Array(LARGEUR_GRILLE).fill(1));
        }
        setGrille(newGrille);
      });

      socket.on("gameOver", ({ winner }) => {
        setGameOver(true);
        alert(`Game Over! Winner: ${winner}`);
      });

      return () => {
        socket.off("waitingForPlayer");
        socket.off("leaderAssigned");
        socket.off("readyToStart");
        socket.off("gameStarted");
        socket.off("penaltyApplied");
        socket.off("gameOver");
      };
    }
  }, [mode, grille, room, playerName]);

  const startSoloGame = () => {
    setMode("solo");
    setScore(0);
    resetGame();
  };

  const handleStartGame = () => {
    if (isLeader) {
      socket.emit("startGame", { room });
    }
  };

  // Réinitialise le jeu
  const resetGame = useCallback(() => {
    setGrille(
      Array.from({ length: HAUTEUR_GRILLE }, () =>
        Array(LARGEUR_GRILLE).fill(0)
      )
    );
    setScore(0);
    setFormX(X_INITIAL);
    setFormY(Y_INITIAL);
    setNumForme(Math.floor(Math.random() * formes.length));
    setRotation(0);
    setGameOver(false);
    setDelay(250);
    setFastDrop(false);
  }, []);

  // Vérifie les collisions
  const collision = useCallback(
    (xOffset = 0, yOffset = 0, rotationOffset = rotation) => {
      const shape = formes[numForme][rotationOffset];
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x] === 1) {
            const newX = formX + x + xOffset;
            const newY = formY + y + yOffset;
            if (
              newX < 0 ||
              newX >= LARGEUR_GRILLE ||
              newY >= HAUTEUR_GRILLE ||
              (newY >= 0 && grille[newY][newX] === 1)
            ) {
              return true;
            }
          }
        }
      }
      return false;
    },
    [formX, formY, rotation, grille, numForme]
  );

  const effacerLignesCompletes = useCallback((newGrille) => {
    let lignesEffacees = 0;
    for (let y = 0; y < HAUTEUR_GRILLE; y++) {
      if (newGrille[y].every((cell) => cell === 1)) {
        newGrille.splice(y, 1);
        newGrille.unshift(Array(LARGEUR_GRILLE).fill(0));
        lignesEffacees++;
      }
    }
    if (lignesEffacees > 0) {
      socket.emit("lineComplete", {
        room,
        lines: lignesEffacees,
      });
    }
    return lignesEffacees;
  }, [room]);

  // Fixe la forme et supprime les lignes complètes
  const fixerForme = useCallback(() => {
    const newGrille = grille.map((row) => [...row]);
    formes[numForme][rotation].forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          const newX = formX + x;
          const newY = formY + y;
          if (
            newY >= 0 &&
            newY < HAUTEUR_GRILLE &&
            newX >= 0 &&
            newX < LARGEUR_GRILLE
          ) {
            newGrille[newY][newX] = 1;
          }
        }
      });
    });
    const lignesEffacees = effacerLignesCompletes(newGrille);
    setScore(score + pointsParLignes[lignesEffacees]);
    setGrille(newGrille);
  }, [grille, formX, formY, rotation, numForme, score, effacerLignesCompletes]);

  // Déplace la pièce automatiquement
  useEffect(() => {
    if (!mode || gameOver) return; // Ajout de la condition pour vérifier que le mode est sélectionné
    socket.emit("gameOver", { room, playerId: socket.id });


    const interval = setInterval(
      () => {
        if (collision(0, 1)) {
          fixerForme();
          setFormX(X_INITIAL);
          setFormY(Y_INITIAL);
          setRotation(0);
          setNumForme(Math.floor(Math.random() * formes.length));
          if (collision(0, 0)) setGameOver(true);
        } else {
          setFormY((prev) => prev + 1);
        }
      },
      fastDrop ? 50 : delay
    );
    return () => clearInterval(interval);
  }, [collision, fixerForme, gameOver, delay, fastDrop, room, mode]);

  // Gère les touches pour déplacer et faire tourner les pièces
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameOver) return;
      if (event.key === "ArrowLeft" && !collision(-1, 0))
        setFormX((prev) => prev - 1);
      if (event.key === "ArrowRight" && !collision(1, 0))
        setFormX((prev) => prev + 1);
      if (event.key === "ArrowUp") {
        const newRotation = (rotation + 1) % formes[numForme].length;
        if (!collision(0, 0, newRotation)) setRotation(newRotation);
      }
      if (event.key === " ") {
        setFastDrop(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === " ") {
        setFastDrop(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [collision, rotation, numForme, gameOver]);


  // Fonction pour obtenir la grille d'affichage avec la pièce en mouvement
  const getDisplayGrid = () => {
    const displayGrid = grille.map((row) => [...row]); // Copie de la grille existante
    formes[numForme][rotation].forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          const newX = formX + x;
          const newY = formY + y;
          if (
            newY >= 0 &&
            newY < HAUTEUR_GRILLE &&
            newX >= 0 &&
            newX < LARGEUR_GRILLE
          ) {
            displayGrid[newY][newX] = 1; // Ajouter temporairement la pièce en mouvement
          }
        }
      });
    });
    return displayGrid;
  };


  
  // Dans le rendu JSX :
  return (
    <div className="tetris-game">
      <div className="score">Score: {score}</div>
      {!mode && (
        <div className="mode-selector">
          <button onClick={startSoloGame}>Mode Solo</button>
          <button onClick={() => setMode("multiplayer")}>Mode Multijoueur</button>
        </div>
      )}
      {mode === "multiplayer" && waitingMessage && (
        <div className="waiting-message">{waitingMessage}</div>
      )}
      {isLeader && isReadyToStart && mode === "multiplayer" && (
        <button className="onClick" onClick={handleStartGame}>
          Start Game
        </button>
      )}
      <div className="tetris-grid">
        {getDisplayGrid().map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className={`tetris-cell ${cell === 1 ? "filled" : ""}`}
            />
          ))
        )}
      </div>
      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={resetGame}>Rejouer</button>
        </div>
      )}
    </div>
  );
}

export default TetrisGame;
