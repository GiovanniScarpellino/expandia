export class UpgradeManager {
    constructor(game) {
        this.game = game;

        this.upgrades = {
            // Economy
            goldRush: {
                name: "Ruée vers l'or",
                description: "Augmente l'or gagné à la fin des combats de 2%.",
                cost: [100, 250, 500],
                costType: 'gold',
                maxLevel: Infinity,
                isImplemented: true,
            },
            artOfWar: {
                name: "Art de la Guerre",
                description: "Augmente le multiplicateur de score en combat de 0.1.",
                cost: [150, 300, 600],
                costType: 'gold',
                maxLevel: Infinity,
                isImplemented: true,
            },
            pioneer: {
                name: "Pionnier",
                description: "Augmente le multiplicateur de score d'exploration de 0.1.",
                cost: [100, 200, 400],
                costType: 'gold',
                maxLevel: Infinity,
                isImplemented: true,
            },
            multiTileUnlock: {
                name: 'Déblocage Multiple',
                description: 'Débloque plusieurs tuiles adjacentes à la fois.',
                cost: [1, 150, 300], // Cost for level 1, 2, 3
                costType: 'wood',
                maxLevel: 3,
                isImplemented: false,
            },
            chickSpeed: {
                name: 'Vitesse des Poussins',
                description: 'Augmente la vitesse de déplacement de tous les poussins de 25%.',
                cost: [75, 200],
                costType: 'wood',
                maxLevel: 2,
                isImplemented: false,
            },
            resourceRespawn: {
                name: 'Réapparition Accélérée',
                description: 'Diminue de 20% le temps de réapparition des ressources.',
                cost: [150],
                costType: 'gold',
                maxLevel: 1,
                isImplemented: false,
            },

            // Combat
            damageUp: {
                name: 'Dégâts Améliorés',
                description: 'Augmente les dégâts des projectiles du joueur de 5 points.',
                cost: [100, 250, 500],
                costType: 'gold',
                maxLevel: 3,
                isImplemented: false,
            },
            attackSpeedUp: {
                name: 'Cadence de Tir',
                description: 'Diminue de 15% le temps entre chaque tir.',
                cost: [125, 300],
                costType: 'gold',
                maxLevel: 2,
                isImplemented: false,
            },
            multiShot: {
                name: 'Tir Multiple',
                description: 'Tire un projectile supplémentaire.',
                cost: [250],
                costType: 'gold',
                maxLevel: 1,
                isImplemented: false,
            },
            pierceShot: {
                name: 'Tir Perforant',
                description: 'Tous les 10 tirs, le projectile traverse les ennemis.',
                cost: [300],
                costType: 'gold',
                maxLevel: 1,
                isImplemented: false,
            },
            playerHealth: {
                name: 'Santé Max Joueur',
                description: 'Augmente la santé maximale du joueur de 25 points.',
                cost: [100, 200],
                costType: 'gold',
                maxLevel: 2,
                isImplemented: false,
            },

            // Base
            baseTurret: {
                name: 'Tourelle de Base',
                description: 'Construit une tourelle sur la base.',
                cost: [200],
                costType: 'stone',
                maxLevel: 1,
                isImplemented: false,
            },
        };

        this.playerUpgrades = {};
        // Initialize player upgrades to level 0
        for (const key in this.upgrades) {
            this.playerUpgrades[key] = 0;
        }
    }

    getUpgradeLevel(upgradeId) {
        return this.playerUpgrades[upgradeId] || 0;
    }

    getUpgradeCost(upgradeId) {
        const upgrade = this.upgrades[upgradeId];
        const currentLevel = this.getUpgradeLevel(upgradeId);
        if (currentLevel >= upgrade.maxLevel) return Infinity;

        if (currentLevel < upgrade.cost.length) {
            return upgrade.cost[currentLevel];
        } else {
            // For infinite upgrades, calculate cost based on the last cost
            const lastCost = upgrade.cost[upgrade.cost.length - 1];
            const costMultiplier = 1.5; // Or some other factor
            // Calculate the cost for the levels beyond the array
            return Math.floor(lastCost * Math.pow(costMultiplier, currentLevel - (upgrade.cost.length - 1)));
        }
    }

    buyUpgrade(upgradeId) {
        const upgrade = this.upgrades[upgradeId];
        const currentLevel = this.getUpgradeLevel(upgradeId);

        if (currentLevel >= upgrade.maxLevel) {
            this.game.ui.showToast(`${upgrade.name} est déjà au niveau maximum.`);
            return;
        }

        const cost = this.getUpgradeCost(upgradeId);
        const costType = upgrade.costType;

        if (this.game[costType] >= cost) {
            // Deduct cost
            if (costType === 'wood') this.game.addResource('tree', -cost);
            else if (costType === 'stone') this.game.addResource('rock', -cost);
            else if (costType === 'gold') this.game.addGold(-cost);

            // Increment level
            this.playerUpgrades[upgradeId]++;

            this.game.ui.showToast(`${upgrade.name} amélioré au niveau ${this.playerUpgrades[upgradeId]} !`);

            // Apply the effect (to be implemented)
            this.applyUpgradeEffect(upgradeId);

            // Refresh the shop UI
            this.game.ui.populateShop();

        } else {
            this.game.ui.showToast(`Pas assez de ${costType} pour acheter ${upgrade.name}.`);
        }
    }

    applyUpgradeEffect(upgradeId) {
        console.log(`Applying effect for ${upgradeId}`);
        if (upgradeId === 'goldRush') {
            this.game.goldMultiplier += 0.02;
        }
        if (upgradeId === 'artOfWar') {
            this.game.combatMultiplier += 0.1;
        }
        if (upgradeId === 'pioneer') {
            this.game.explorationMultiplier += 0.1;
        }
        this.game.ui.updatePermanentStats(this.game.player);
    }
}
