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
  const [isLeader, setIsLeader] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [pieceSequence, setPieceSequence] = useState([]);
  const [pieceIndex, setPieceIndex] = useState(0);

  // Récupérer room et playerName à partir de l'URL
  const params = new URLSearchParams(window.location.search);
  const [room, setRoom] = useState(() => params.get("room"));
  const [playerName, setPlayerName] = useState(
    () => params.get("playerName") || null
  );

  const [mode, setMode] = useState(() => params.get("mode"));

  useEffect(() => {
    if (!playerName && socket.id) {
      setPlayerName(`Player_${socket.id}`);
    }
  }, [playerName]);

  useEffect(() => {
    // Mise à jour des rooms pour le multijoueur
    if (mode === "multiplayer") {
      fetch("/rooms")
        .then((res) => res.json())
        .then((data) => setRooms(data))
        .catch((error) =>
          console.error("Erreur lors de la récupération des rooms :", error)
        );
    }
  }, [mode]);

  useEffect(() => {
    if (!mode || !room || !playerName) return;
    socket.emit("joinRoom", { room, playerName, mode });
  }, [mode, room, playerName]);

  useEffect(() => {
    if (mode === "multiplayer") {
      // Événements spécifiques au multijoueur
      socket.on("youAreLeader", () => {
        setIsLeader(true);
      });

      socket.on("readyToStart", () => {
        console.log("Événement readyToStart reçu : isLeader =", isLeader);
        // Affiche le message uniquement si le joueur est le leader
        if (isLeader) {
          alert(
            "Tous les joueurs sont prêts. Vous êtes le leader, vous pouvez démarrer la partie !"
          );
        } else {
          console.log(
            "Vous n'êtes pas le leader. En attente du démarrage par le leader."
          );
        }
      });

      socket.on("penaltyApplied", ({ lines }) => {
        setGrille((prevGrille) => {
          const newGrille = [...prevGrille];
          for (let i = 0; i < lines; i++) {
            newGrille.shift();
            newGrille.push(Array(LARGEUR_GRILLE).fill(1));
          }
          return newGrille;
        });
      });

      socket.on("gameOver", ({ winner }) => {
        //(`Game Over! Winner: ${winner}`);
        setGameOver(true);
        setMode(null);
        window.location.href = "http://localhost:3000"; // Redirection
      });
    } else if (mode === "solo") {
      // Événements spécifiques au mode solo
      socket.on("gameStarted", ({ pieces }) => {
        console.log("Game started with pieces:", pieces);
        setNumForme(pieces[0]);
        setScore(0);
        setGameOver(false);
        setGrille(
          Array.from({ length: HAUTEUR_GRILLE }, () =>
            Array(LARGEUR_GRILLE).fill(0)
          )
        );
      });

      socket.on("gameOver", () => {
        console.log("Game Over!");
        setGameOver(true);
      });
    }

    socket.on("gameStarted", ({ pieces }) => {
      setScore(0);
      setGameOver(false);
      setGrille(
        Array.from({ length: HAUTEUR_GRILLE }, () =>
          Array(LARGEUR_GRILLE).fill(0)
        )
      );

      if (mode === "multiplayer") {
        setPieceSequence(pieces);
        setPieceIndex(0);
        setNumForme(pieces[0]);
      } else if (mode === "solo") {
        setNumForme(Math.floor(Math.random() * formes.length));
      }
    });

    return () => {
      socket.off("youAreLeader");
      socket.off("readyToStart");
      socket.off("gameStarted");
      socket.off("penaltyApplied");
      socket.off("gameOver");
    };
  }, [mode, isLeader, pieceSequence]);

  useEffect(() => {
    console.log("État actuel de isLeader :", isLeader);
  }, [isLeader]);

  const joinRoom = (roomName) => {
    if (!roomName || roomName === "null") {
      alert("Room invalide. Veuillez sélectionner une autre room.");
      return;
    }
    const playerName = prompt("Entrez votre nom");
    if (playerName) {
      setRoom(roomName);
      setPlayerName(playerName);
      setMode("multiplayer"); // Définir le mode sur multijoueur
      window.history.pushState(
        null,
        "",
        `/?room=${roomName}&playerName=${playerName}&mode=multiplayer`
      );
    } else {
      alert("Nom du joueur requis !");
    }
  };

  const startSoloGame = () => {
    fetch("/solo")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Données de /solo :", data);
        if (data.roomUrl) {
          const urlParams = new URL(data.roomUrl);
          const newRoom = urlParams.searchParams.get("room");
          const newPlayerName = urlParams.searchParams.get("playerName");
          const newMode = urlParams.searchParams.get("mode") || "solo";
          console.log("Nouvelle Room :", newRoom);
          console.log("Nom du Joueur :", newPlayerName);
          setMode(newMode);
          setRoom(newRoom);
          setPlayerName(newPlayerName);
          window.history.pushState(
            null,
            "",
            `/?room=${newRoom}&playerName=${newPlayerName}&mode=${newMode}`
          );
        } else {
          console.error("Erreur : l'URL de la room solo est manquante.");
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la création de la room solo :", error);
        alert("Impossible de créer une partie solo. Réessayez.");
      });
  };

  const startMultiplayerGame = () => {
    console.log("Démarrage du mode multijoueur...");
    setMode("multiplayer");
    fetch("/rooms")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP : ${response.status}`);
        }
        return response.json();
      })
      .then((rooms) => {
        console.log("Rooms récupérées avant filtrage :", rooms);
        const validRooms = rooms.filter(
          (room) => room.roomName && room.roomName !== "null"
        );
        console.log("Rooms valides :", validRooms);
        setRooms(validRooms); // Mettre à jour uniquement les rooms valides
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des rooms :", error);
        alert("Impossible de récupérer les rooms. Veuillez réessayer.");
      });
  };

  const handleStartGame = () => {
    if (!room || room === "null") {
      alert("Veuillez sélectionner une room valide avant de démarrer !");
      return;
    }
    if (isLeader) {
      console.log("Le leader démarre la partie...");
      socket.emit("startGameMulti", { room });
    } else {
      alert("Seul le leader peut démarrer la partie !");
    }
  };

  // Réinitialise le jeu
  const resetGame = useCallback(() => {
    if (mode === "solo") {
      socket.emit("restartGame", { room });
    } else {
      window.location.href = "http://localhost:3000";
    }
  }, [mode, room]);

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

  const effacerLignesCompletes = useCallback(
    (newGrille) => {
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
    },
    [room]
  );

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

    if (mode === "multiplayer") {
      console.log("fixerForme - Vérification de pieceSequence :", pieceSequence);
      if (!pieceSequence || pieceSequence.length === 0) {
        console.error("Erreur : Séquence de pièces vide dans fixerForme.");
        return;
      }

      setPieceIndex((prevIndex) => {
        const newIndex = prevIndex + 1;
        const nextPiece = pieceSequence[newIndex % pieceSequence.length];
        console.log("Nouvelle pièce assignée (multijoueur) :", nextPiece);
        setNumForme(nextPiece);
        return newIndex;
      });
    } else if (mode === "solo") {
      setNumForme(Math.floor(Math.random() * formes.length));
    }
  }, [
    grille,
    formX,
    formY,
    rotation,
    numForme,
    score,
    effacerLignesCompletes,
    pieceSequence,
    mode,
  ]);

  useEffect(() => {
    console.log("État actuel - pieceSequence :", pieceSequence);
    console.log("État actuel - pieceIndex :", pieceIndex);
    console.log("État actuel - numForme :", numForme);
  }, [pieceSequence, pieceIndex, numForme]);
  useEffect(() => {
    if (gameOver && mode === "solo") {
      socket.emit("gameOver", { room });
    }
  }, [gameOver, mode, room]);

  useEffect(() => {
    if (!mode || gameOver) return;
    const interval = setInterval(
      () => {
        if (collision(0, 1)) {
          fixerForme();
          setFormX(X_INITIAL);
          setFormY(Y_INITIAL);
          setRotation(0);

          // Définir la nouvelle forme en fonction du mode
          if (mode === "multiplayer") {
            // En multijoueur, `numForme` est déjà mis à jour dans `fixerForme`
          } else if (mode === "solo") {
            // En solo, générer une nouvelle pièce aléatoire
            setNumForme(Math.floor(Math.random() * formes.length));
          }

          if (collision(0, 0)) {
            setGameOver(true);
            if (mode === "multiplayer") {
              socket.emit("gameOver", { room, playerId: socket.id });
            } else if (mode === "solo") {
              socket.emit("gameOver", { room });
            }
          }
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

  const handleModeSelection = (selectedMode) => {
    console.log("Mode sélectionné :", selectedMode);
    if (selectedMode === "solo") {
      startSoloGame(); // Redirige automatiquement
    } else if (selectedMode === "multiplayer") {
      setRoom(null); // Réinitialiser la room sélectionnée
      setPlayerName(null); // Réinitialiser le nom du joueur
      startMultiplayerGame();
    }
  };

  // Dans le rendu JSX :
  return (
    <div className="tetris-game">
      <div className="score">Score: {score}</div>
      {!mode && (
        <div className="mode-selector">
          <button onClick={() => handleModeSelection("solo")}>Mode Solo</button>
          <button onClick={() => handleModeSelection("multiplayer")}>
            Mode Multijoueur
          </button>
        </div>
      )}
      {mode === "multiplayer" && (
        <div className="room-list">
          <h2>Rooms disponibles</h2>
          <ul>
            {rooms.map((room, index) => (
              <li key={index} className="room-item">
                <p>
                  <strong>{room.roomName}</strong> - Joueurs : {room.players} -{" "}
                  {room.isStarted ? "En cours" : "En attente"}
                </p>
                {!room.isStarted && (
                  <button onClick={() => joinRoom(room.roomName)}>
                    Rejoindre cette room
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {isLeader && rooms.find((r) => r.roomName === room)?.players >= 2 && (
        <button onClick={() => handleStartGame()}>Démarrer la Partie</button>
      )}
      {room && playerName && (
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
      )}
      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <div className="game-over-buttons">
            <button onClick={resetGame}>Rejouer</button>
            <button
              className="quit-button"
              onClick={() => {
                window.location.href = "http://localhost:3000"; // Retour à la page d'accueil
              }}
            >
              Quitter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default TetrisGame;
