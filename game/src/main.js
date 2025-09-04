import { Game } from './Game.js';
import { ModelLoader } from './utils/ModelLoader.js';

const loadingScreen = document.getElementById('loading-screen');

async function main() {
    const modelLoader = new ModelLoader();

    const treeModelUrls = [
        '/src/models/tree.glb',
        '/src/models/tree-crooked.glb',
    ];
    const rockModelUrls = [
        '/src/models/rock-small.glb',
        '/src/models/rock-large.glb',
        '/src/models/rock-wide.glb'
    ];

    // A map of all models to load
    const modelsToLoad = {
        player: '/src/models/character-a.glb',
        enemy: '/src/models/character-a.glb',
        npc: '/src/models/character-a.glb',
        base: '/src/models/blade.glb',
        trees: treeModelUrls,
        rocks: rockModelUrls
    };

    const loadedModels = {};

    // Load single models
    const singleModelKeys = Object.keys(modelsToLoad).filter(key => typeof modelsToLoad[key] === 'string');
    const singleModelPromises = singleModelKeys.map(key => modelLoader.load(modelsToLoad[key]));
    const loadedSingleModels = await Promise.all(singleModelPromises);
    singleModelKeys.forEach((key, index) => {
        loadedModels[key] = loadedSingleModels[index];
    });

    // Load arrays of models
    loadedModels.trees = await Promise.all(modelsToLoad.trees.map(url => modelLoader.load(url)));
    loadedModels.rocks = await Promise.all(modelsToLoad.rocks.map(url => modelLoader.load(url)));

    // Hide loading screen
    loadingScreen.style.display = 'none';

    // Start game
    const game = new Game(loadedModels);
    game.start();

    // --- Save/Delete Buttons Logic ---
    const saveButton = document.getElementById('save-button');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            game.saveState();
        });
    }

    const deleteSaveButton = document.getElementById('delete-save-button');
    if (deleteSaveButton) {
        deleteSaveButton.addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment supprimer la sauvegarde ? Cette action est irréversible.')) {
                game.gameStateManager.deleteSave();
                alert('Sauvegarde supprimée. La page va se rafraîchir pour commencer une nouvelle partie.');
                location.reload();
            }
        });
    }
}

main().catch(error => {
    console.error("Failed to initialize the game:", error);
    loadingScreen.innerHTML = `<p style="color: red;">Erreur lors du chargement du jeu. Veuillez vérifier la console.</p>`;
});
