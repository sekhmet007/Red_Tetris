const LARGEUR_GRILLE = 10;
const HAUTEUR_GRILLE = 20;
const X_INITIAL = 3;
const Y_INITIAL = 0;

let formX = X_INITIAL;
let formY = Y_INITIAL;
let numForme = 0;

let rotation = 0;
let delay = 250;
let fastDelay = 50; // Vitesse de descente rapide pour l'espace
let gameOver = false;
let fastDrop = false; // Indique si la vitesse rapide est activée
let score = 0;

const grille = Array.from({ length: HAUTEUR_GRILLE }, () =>
  Array(LARGEUR_GRILLE).fill(0)
);
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

// Initialisation de la grille HTML
const gridElement = document.getElementById("game");
for (let i = 0; i < HAUTEUR_GRILLE * LARGEUR_GRILLE; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  gridElement.appendChild(cell);
}
// Ajout d’un élément pour le message de Game Over
const gameOverElement = document.createElement("div");
gameOverElement.classList.add("game-over");
gameOverElement.innerHTML = `
  <h2>Game Over</h2>
  <button id="retry">Rejouer</button>
  <button id="quit">Quitter</button>
`;
document.body.appendChild(gameOverElement);
gameOverElement.style.display = "none"; // Masquer par défaut

// Ajout d’un élément pour le score
const scoreElement = document.createElement("div");
scoreElement.classList.add("score");
scoreElement.innerHTML = `Score: ${score}`;
document.body.appendChild(scoreElement);

// Fonction pour mettre à jour l’affichage du score
function updateScore(points) {
  score += points;
  scoreElement.innerHTML = `Score: ${score}`;
}


// Fonction pour vérifier les collisions
function collision(xOffset = 0, yOffset = 0, rotationOffset = rotation) {
  const shape = formes[numForme][rotationOffset];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] === 1) {
        const newX = formX + x + xOffset;
        const newY = formY + y + yOffset;

        // Vérifie si la pièce dépasse les limites de la grille ou touche une case occupée
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
}

// Fonction pour dessiner la grille et les pièces fixées
function drawGrille() {
  gridElement.querySelectorAll(".cell").forEach((cell, i) => {
    const x = i % LARGEUR_GRILLE;
    const y = Math.floor(i / LARGEUR_GRILLE);
    cell.className = grille[y][x] === 1 ? "cell filled" : "cell";
  });
}

// Fonction pour dessiner la forme en mouvement
function drawForme() {
  if (gameOver) return; // Ne dessine rien si le jeu est terminé
  drawGrille();
  const colors = ["I", "J", "L", "O", "S", "T", "Z"];
  const className = `filled-${colors[numForme]}`;

  formes[numForme][rotation].forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === 1) {
        const index = (formY + y) * LARGEUR_GRILLE + (formX + x);
        if (index >= 0 && index < HAUTEUR_GRILLE * LARGEUR_GRILLE) {
          gridElement.children[index].classList.add(className);
        }
      }
    });
  });
}

// Fonction pour fixer la forme dans la grille
function fixerForme() {
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
          grille[newY][newX] = 1; // Marque la case comme occupée
        }
      }
    });
  });
  const lignesEffacees = effacerLignesCompletes(); // Efface les lignes complètes et retourne le nombre de lignes effacées
  calculerScore(lignesEffacees); // Calcule le score en fonction du no
}

// Fonction pour effacer les lignes complètes
// Fonction pour effacer les lignes complètes
function effacerLignesCompletes() {
  let lignesEffacees = 0;
  for (let y = 0; y < HAUTEUR_GRILLE; y++) {
    if (grille[y].every(cell => cell === 1)) {
      grille.splice(y, 1); // Supprime la ligne complète
      grille.unshift(Array(LARGEUR_GRILLE).fill(0)); // Ajoute une ligne vide en haut
      lignesEffacees++; // Incrémente le compteur de lignes effacées
    }
  }
  return lignesEffacees;
}

// Fonction pour calculer le score en fonction des lignes effacées
function calculerScore(lignesEffacees) {
  const pointsParLignes = [0, 40, 100, 300, 1200]; // Scores pour 0, 1, 2, 3, et 4 lignes effacées
  updateScore(pointsParLignes[lignesEffacees] || 0);
}

// Fonction de rafraîchissement automatique pour faire tomber les formes
function refreshCanvas() {
  if (gameOver) return; // Arrête le rafraîchissement si le jeu est terminé
  // Si la pièce ne peut pas descendre davantage, on la fixe dans la grille et génère une nouvelle pièce
  if (collision(0, 1)) {
    fixerForme(); // Fixe la forme dans la grille
    nouvelleForme(); // Génère une nouvelle pièce
  } else {
    formY++; // Descend la pièce d'une case
  }

  drawForme();
  // Définit la vitesse en fonction de `fastDrop`
  setTimeout(refreshCanvas, fastDrop ? fastDelay : delay);
}

// Fonction pour générer une nouvelle forme aléatoire
function nouvelleForme() {
  if (gameOver) return; // Ne génère pas de nouvelle pièce si le jeu est terminé

  numForme = Math.floor(Math.random() * formes.length); // Choisit une forme aléatoire
  rotation = 0; // Réinitialise la rotation
  formX = X_INITIAL; // Réinitialise la position en X
  formY = Y_INITIAL; // Réinitialise la position en Y

  // Vérifie s'il y a un Game Over (la nouvelle pièce entre en collision dès le départ)
  if (collision(0, 0)) {
    afficherGameOver(); // Affiche le message de Game Over
  }
}

// Affiche le message de Game Over
function afficherGameOver() {
  gameOver = true;
  gameOverElement.style.display = "block"; // Affiche l'élément Game Over
}

// Fonction pour réinitialiser la partie
function resetGame() {
  grille.forEach((row) => row.fill(0)); // Vide la grille
  score = 0; // Réinitialise le score
  updateScore(0); // Met à jour l'affichage du score
  gameOver = false;
  gameOverElement.style.display = "none"; // Masque le message de Game Over
  nouvelleForme();
  refreshCanvas();
}

// Événements pour Rejouer et Quitter
document.getElementById("retry").addEventListener("click", resetGame);
document.getElementById("quit").addEventListener("click", () => {
  gameOverElement.innerHTML = "<h2>Merci d'avoir joué !</h2>"; // Remplace le message pour quitter
});

// Initialisation
nouvelleForme(); // Démarre avec une forme aléatoire
refreshCanvas(); // Lance la descente automatique des pièces

// Gestion des événements clavier pour les déplacements horizontaux et la rotation
window.addEventListener("keydown", (event) => {
  if (!gameOver) {
    if (event.key === "ArrowUp") {
      const newRotation = (rotation + 1) % formes[numForme].length;
      if (!collision(0, 0, newRotation)) {
        rotation = newRotation;
        drawForme();
      }
    } else if (event.key === "ArrowLeft") {
      if (!collision(-1, 0)) {
        formX--;
        drawForme();
      }
    } else if (event.key === "ArrowRight") {
      if (!collision(1, 0)) {
        formX++;
        drawForme();
      }
    } else if (event.key === " ") {
      fastDrop = true; // Active la vitesse rapide
    }
  }
});

// Réinitialise la vitesse lorsque la touche `Espace` est relâchée
window.addEventListener("keyup", (event) => {
  if (event.key === " ") {
    fastDrop = false; // Désactive la vitesse rapide
  }
});
