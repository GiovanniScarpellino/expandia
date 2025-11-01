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
        this.goldCounter = document.getElementById('gold-counter');

        // Objective elements
        this.objectiveText = document.getElementById('objective-text');

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
        this.toastContainer = document.getElementById('toast-container');

        // Initial state
        this.updateHealth(100, 100);
        this.updateXpBar(0, 100, 1);
        this.updateWaveStats(0, 0);
        this.updateResources(0, 0, 0);
        this.updateObjective(0, 5); // Initial objective: 0/5 fragments
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

        // --- Units Section ---
        const unitsHeader = document.createElement('h3');
        unitsHeader.className = 'shop-section-header';
        unitsHeader.innerText = 'Unités';
        this.shopItemsContainer.appendChild(unitsHeader);

        const units = [
            { id: 'lumberjackChick', name: 'Poussin Bûcheron', cost: { wood: 10, stone: 0 }, action: () => this.game.buildingManager.createLumberjackChick() },
            { id: 'minerChick', name: 'Poussin Mineur', cost: { wood: 0, stone: 10 }, action: () => this.game.buildingManager.createMinerChick() },
        ];

        units.forEach(item => {
            const costText = item.cost.wood > 0 ? `${item.cost.wood} bois` : `${item.cost.stone} pierre`;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <span>${item.name}</span>
                <div class="shop-action">
                    <span>Coût: ${costText}</span>
                    <button>Acheter</button>
                </div>
            `;
            itemDiv.querySelector('button').addEventListener('click', () => {
                const success = item.action();
                if (success) {
                    this.showToast(`${item.name} acheté !`);
                } else {
                    const costType = item.cost.wood > 0 ? 'bois' : 'pierre';
                    this.showToast(`Pas assez de ${costType}.`);
                }
            });
            this.shopItemsContainer.appendChild(itemDiv);
        });

        // --- Upgrades Section ---
        const upgradesHeader = document.createElement('h3');
        upgradesHeader.className = 'shop-section-header';
        upgradesHeader.innerText = 'Améliorations';
        this.shopItemsContainer.appendChild(upgradesHeader);

        const allUpgrades = this.game.upgradeManager.upgrades;

        for (const id in allUpgrades) {
            const upgrade = allUpgrades[id];
            if (!upgrade.isImplemented) continue;

            const currentLevel = this.game.upgradeManager.getUpgradeLevel(id);
            const cost = this.game.upgradeManager.getUpgradeCost(id);

            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item upgrade-item';

            let costText = 'Max';
            if (cost !== Infinity) {
                const costType = upgrade.costType === 'wood' ? 'bois' : upgrade.costType === 'stone' ? 'pierre' : 'or';
                costText = `${cost} ${costType}`;
            }

            itemDiv.innerHTML = `
                <div class="upgrade-info">
                    <h4>${upgrade.name} <span>(Niv. ${currentLevel} / ${upgrade.maxLevel})</span></h4>
                    <p>${upgrade.description}</p>
                </div>
                <div class="shop-action">
                    <span>Coût: ${costText}</span>
                    <button ${cost === Infinity ? 'disabled' : ''}>Acheter</button>
                </div>
            `;

            if (cost !== Infinity) {
                itemDiv.querySelector('button').addEventListener('click', () => {
                    this.game.upgradeManager.buyUpgrade(id);
                });
            }

            this.shopItemsContainer.appendChild(itemDiv);
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        this.toastContainer.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
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

    updateResources(wood, stone, gold) {
        if (this.woodCounter) {
            this.woodCounter.innerText = `Bois: ${wood}`;
        }
        if (this.stoneCounter) {
            this.stoneCounter.innerText = `Pierre: ${stone}`;
        }
        if (this.goldCounter) {
            this.goldCounter.innerText = `Or: ${gold}`;
        }
    }

    updateObjective(currentFragments, totalFragments) {
        if (this.objectiveText) {
            this.objectiveText.innerText = `Objectif: Réparer le Cœur (${currentFragments} / ${totalFragments})`;
        }
    }
}
