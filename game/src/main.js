import { BabylonGame } from './BabylonGame.js';

const loadingScreen = document.getElementById('loading-screen');

async function main() {
    // Hide loading screen
    loadingScreen.style.display = 'none';

    // Start game
    const game = new BabylonGame();
    await game.initialize(); // Initialize and load assets
    game.start();
}

main().catch(error => {
    console.error("Failed to initialize the game:", error);
    loadingScreen.innerHTML = `<p style="color: red;">Erreur lors du chargement du jeu. Veuillez vérifier la console.</p>`;
});
