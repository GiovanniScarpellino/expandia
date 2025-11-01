export class UI {
    constructor(game) {
        this.game = game;

        // Player stats elements
        this.healthBarFill = document.querySelector('#health-bar-fill');
        this.healthText = document.querySelector('#health-text');
        this.xpBarFill = document.querySelector('#xp-bar-fill');
        this.levelText = document.querySelector('#level-text');

        // Resource elements
        this.woodCounter = document.getElementById('wood-counter');
        this.stoneCounter = document.getElementById('stone-counter');

        // Wave stats elements
        this.waveStats = document.getElementById('wave-stats');
        this.waveCounter = document.getElementById('wave-counter');
        this.enemyCounter = document.getElementById('enemy-counter');

        // Overlay screens
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.levelUpScreen = document.getElementById('levelup-screen');
        this.upgradeCardsContainer = document.getElementById('upgrade-cards-container');
        this.baseShopScreen = document.getElementById('base-shop-screen');
        this.shopItemsContainer = document.getElementById('shop-items-container');
        this.closeShopButton = document.getElementById('close-shop-button');

        // Initial state
        this.updateHealth(100, 100);
        this.updateXpBar(0, 100, 1);
        this.updateWaveStats(0, 0);
        this.updateResources(0, 0);
        this.waveStats.style.display = 'none';

        this.closeShopButton.addEventListener('click', () => this.hideBaseShopScreen());
    }

    togglePauseScreen(show) {
        this.pauseScreen.style.display = show ? 'flex' : 'none';
    }

    showGameOverScreen() {
        this.gameOverScreen.style.display = 'flex';
    }

    showLevelUpScreen(upgrades) {
        // Clear previous cards
        this.upgradeCardsContainer.innerHTML = '';

        // Create new cards
        upgrades.forEach(upgrade => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `<h3>${upgrade.name}</h3><p>${upgrade.description}</p>`;
            card.addEventListener('click', () => {
                this.game.applyUpgradeAndResume(upgrade);
            });
            this.upgradeCardsContainer.appendChild(card);
        });

        this.levelUpScreen.style.display = 'flex';
    }

    hideLevelUpScreen() {
        this.levelUpScreen.style.display = 'none';
    }

    showBaseShopScreen() {
        this.populateShop();
        this.baseShopScreen.style.display = 'flex';
        this.game.gameState = 'PAUSED';
    }

    hideBaseShopScreen() {
        this.baseShopScreen.style.display = 'none';
        this.game.gameState = 'RUNNING';
    }

    populateShop() {
        this.shopItemsContainer.innerHTML = '';
        const items = [
            { id: 'lumberjackChick', name: 'Poussin Bûcheron', cost: { wood: 10, stone: 0 } },
        ];

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <span>${item.name}</span>
                <span>Coût: ${item.cost.wood} bois</span>
                <button>Acheter</button>
            `;
            itemDiv.querySelector('button').addEventListener('click', () => {
                this.game.buildingManager.createChick(item.id, this.game.base.position);
            });
            this.shopItemsContainer.appendChild(itemDiv);
        });
    }

    updateHealth(currentHealth, maxHealth) {
        const percentage = (currentHealth / maxHealth) * 100;
        if (this.healthBarFill) {
            this.healthBarFill.style.width = `${percentage}%`;
        }
        if (this.healthText) {
            this.healthText.innerText = `${currentHealth} / ${maxHealth}`;
        }
    }

    updateXpBar(currentXp, xpForNextLevel, level) {
        const percentage = (currentXp / xpForNextLevel) * 100;
        if (this.xpBarFill) {
            this.xpBarFill.style.width = `${percentage}%`;
        }
        if (this.levelText) {
            this.levelText.innerText = `Niv. ${level}`;
        }
    }

    updateWaveStats(waveNumber, remainingEnemies) {
        if (this.game.gameMode === 'COMBAT') {
            this.waveStats.style.display = 'block';
            if (this.waveCounter) {
                this.waveCounter.innerText = `Manche: ${waveNumber}`;
            }
            if (this.enemyCounter) {
                this.enemyCounter.innerText = `Ennemis: ${remainingEnemies}`;
            }
        } else {
            this.waveStats.style.display = 'none';
        }
    }

    updateResources(wood, stone) {
        if (this.woodCounter) {
            this.woodCounter.innerText = `Bois: ${wood}`;
        }
        if (this.stoneCounter) {
            this.stoneCounter.innerText = `Pierre: ${stone}`;
        }
    }
}
