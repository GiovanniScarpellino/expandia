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

        // Score
        this.scoreValue = document.getElementById('score-value');

        // Wave stats elements
        this.waveStats = document.getElementById('wave-stats');
        this.enemyCounter = document.getElementById('enemy-counter');

        // Permanent stats elements
        this.permAttackSpeed = document.getElementById('perm-attack-speed');
        this.permProjSpeed = document.getElementById('perm-proj-speed');
        this.permDamage = document.getElementById('perm-damage');
        this.permProjCount = document.getElementById('perm-proj-count');
        this.permProjSize = document.getElementById('perm-proj-size');
        this.permCombatMult = document.getElementById('perm-combat-mult');
        this.permExploMult = document.getElementById('perm-explo-mult');

        // Overlay screens
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.levelUpScreen = document.getElementById('levelup-screen');
        this.upgradeCardsContainer = document.getElementById('upgrade-cards-container');
        this.baseShopScreen = document.getElementById('base-shop-screen');
        this.shopItemsContainer = document.getElementById('shop-items-container');
        this.closeShopButton = document.getElementById('close-shop-button');
        this.toastContainer = document.getElementById('toast-container');

        // Buttons
        this.pauseLumberjackButton = document.getElementById('pause-lumberjack-button');
        this.pauseMinerButton = document.getElementById('pause-miner-button');
        this.pauseExplorerButton = document.getElementById('pause-explorer-button');

        // Initial state
        this.updateHealth(100, 100);
        this.updateXpBar(0, 100, 1);
        this.updateWaveStats(0, 0);
        this.updateResources(0, 0, 0);
        this.updateScore(0);
        this.updateMultipliers(1, 1);
        this.waveStats.style.display = 'none';

        this.closeShopButton.addEventListener('click', () => this.hideBaseShopScreen());
        this.pauseLumberjackButton.addEventListener('click', () => {
            this.game.toggleChicksPause('LUMBERJACK');
            this.updatePauseButtons();
        });
        this.pauseMinerButton.addEventListener('click', () => {
            this.game.toggleChicksPause('MINER');
            this.updatePauseButtons();
        });
        this.pauseExplorerButton.addEventListener('click', () => {
            this.game.toggleChicksPause('EXPLORER');
            this.updatePauseButtons();
        });
    }

    updatePauseButtons() {
        if (this.game.chickPauseState['LUMBERJACK']) {
            this.pauseLumberjackButton.innerText = 'Play Bûcherons';
            this.pauseLumberjackButton.classList.add('paused');
        } else {
            this.pauseLumberjackButton.innerText = 'Pause Bûcherons';
            this.pauseLumberjackButton.classList.remove('paused');
        }
        if (this.game.chickPauseState['MINER']) {
            this.pauseMinerButton.innerText = 'Play Mineurs';
            this.pauseMinerButton.classList.add('paused');
        } else {
            this.pauseMinerButton.innerText = 'Pause Mineurs';
            this.pauseMinerButton.classList.remove('paused');
        }
        if (this.game.chickPauseState['EXPLORER']) {
            this.pauseExplorerButton.innerText = 'Play Explorateurs';
            this.pauseExplorerButton.classList.add('paused');
        } else {
            this.pauseExplorerButton.innerText = 'Pause Explorateurs';
            this.pauseExplorerButton.classList.remove('paused');
        }
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

        // Player stats
        const player = this.game.player;
        const statsContainer = document.getElementById('player-stats-container');
        statsContainer.innerHTML = `
            <h3>Statistiques Actuelles</h3>
            <ul>
                <li><strong>PV Max:</strong> ${player.maxHealth}</li>
                <li><strong>Vitesse d'Attaque:</strong> ${(1000 / player.attackSpeed).toFixed(2)}/s</li>
                <li><strong>Vitesse Projectiles:</strong> ${player.projectileSpeedModifier.toFixed(2)}x</li>
                <li><strong>Dégâts:</strong> ${player.projectileDamage}</li>
                <li><strong>Nb. Projectiles:</strong> ${player.projectileCount}</li>
                <li><strong>Taille Projectiles:</strong> ${player.projectileSizeModifier.toFixed(2)}x</li>
            </ul>
        `;

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
            { id: 'lumberjackChick', name: 'Poussin Bûcheron', action: () => this.game.buildingManager.createLumberjackChick() },
            { id: 'minerChick', name: 'Poussin Mineur', action: () => this.game.buildingManager.createMinerChick() },
            { id: 'explorerChick', name: 'Poussin Explorateur', action: () => this.game.buildingManager.createExplorerChick() },
        ];

        units.forEach(item => {
            let cost, costType;
            if (item.id === 'lumberjackChick') {
                cost = this.game.buildingManager.getLumberjackChickCost();
                costType = 'bois';
            } else if (item.id === 'minerChick') {
                cost = this.game.buildingManager.getMinerChickCost();
                costType = 'pierre';
            } else if (item.id === 'explorerChick') {
                cost = this.game.buildingManager.getExplorerChickCost();
                costType = 'bois';
            }
            const costText = `${cost} ${costType}`;

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
                    this.populateShop(); // Refresh shop to show new price
                } else {
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

        // --- Items Section ---
        const itemsHeader = document.createElement('h3');
        itemsHeader.className = 'shop-section-header';
        itemsHeader.innerText = 'Objets';
        this.shopItemsContainer.appendChild(itemsHeader);

        const items = [
            { id: 'minimap', name: 'Mini-carte', cost: 0, costType: 'gold', action: (cost) => this.game.buyMinimap(cost) },
        ];

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            const canAfford = this.game.gold >= item.cost;
            const isBought = (item.id === 'minimap' && this.game.hasMinimap);

            itemDiv.innerHTML = `
                <span>${item.name}</span>
                <div class="shop-action">
                    <span>Coût: ${item.cost} ${item.costType}</span>
                    <button ${!canAfford || isBought ? 'disabled' : ''}>${isBought ? 'Acheté' : 'Acheter'}</button>
                </div>
            `;
            itemDiv.querySelector('button').addEventListener('click', () => {
                const success = item.action(item.cost);
                if (success) {
                    this.showToast(`${item.name} acheté !`);
                    this.populateShop(); // Refresh shop to show new price/state
                } else {
                    this.showToast(`Pas assez d'${item.costType}.`);
                }
            });
            this.shopItemsContainer.appendChild(itemDiv);
        });
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

    updateScore(score) {
        if (this.scoreValue) {
            this.scoreValue.innerText = score;
        }
    }

    updateMultipliers(combat, exploration) {
        if (this.permCombatMult) {
            this.permCombatMult.innerText = `${combat.toFixed(1)}x`;
        }
        if (this.permExploMult) {
            this.permExploMult.innerText = `${exploration.toFixed(1)}x`;
        }
    }

    updatePermanentStats(player) {
        if (!player) return;
        if (this.permAttackSpeed) {
            this.permAttackSpeed.innerText = `${(1000 / player.attackSpeed).toFixed(2)}/s`;
        }
        if (this.permProjSpeed) {
            this.permProjSpeed.innerText = `${player.projectileSpeedModifier.toFixed(2)}x`;
        }
        if (this.permDamage) {
            this.permDamage.innerText = player.projectileDamage;
        }
        if (this.permProjCount) {
            this.permProjCount.innerText = player.projectileCount;
        }
        if (this.permProjSize) {
            this.permProjSize.innerText = `${player.projectileSizeModifier.toFixed(2)}x`;
        }
        this.updateMultipliers(this.game.combatMultiplier, this.game.explorationMultiplier);
    }
}
