import * as BABYLON from '@babylonjs/core';
import { Bug } from '../babylon/Bug.js';
import { ArmoredBug } from '../babylon/ArmoredBug.js';
import { Watchtower } from '../babylon/Watchtower.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.enemies = [];
        this.arenaCenter = null;
        this.currentCombatConfig = null;
    }

    start(arenaCenter, combatCount) {
        this.arenaCenter = arenaCenter;
        this.currentCombatConfig = this.generateCombatConfig(combatCount);
        this.spawnEnemies();
        console.log(`EnemyManager started for arena combat. Difficulty: ${combatCount}`);
    }

    stop() {
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
        this.arenaCenter = null;
        this.currentCombatConfig = null;
        console.log("EnemyManager stopped.");
    }

    update(delta) {
        if (!this.arenaCenter) return;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].isDisposed) {
                this.enemies.splice(i, 1);
            } else {
                this.enemies[i].update(delta);
            }
        }

        if (this.enemies.length === 0) {
            this.giveRewards();
            this.game.endCombat();
        }
    }

    generateCombatConfig(combatCount) {
        const bugCount = 10 + combatCount * 5;
        const armoredBugCount = combatCount * 2;
        const watchtowerCount = Math.floor(combatCount / 3);

        const healthMultiplier = 1 + (combatCount - 1) * 0.2;
        const damageMultiplier = 1 + (combatCount - 1) * 0.1;

        const goldReward = 50 + (combatCount - 1) * 25;

        return {
            bug: bugCount,
            armoredBug: armoredBugCount,
            watchtower: watchtowerCount,
            healthMultiplier: healthMultiplier,
            damageMultiplier: damageMultiplier,
            reward: { gold: goldReward }
        };
    }

    spawnEnemies() {
        const { bug, armoredBug, watchtower, healthMultiplier, damageMultiplier } = this.currentCombatConfig;
        const totalEnemies = bug + armoredBug + watchtower;
        console.log(`Spawning ${totalEnemies} enemies.`);

        let spawnedCount = 0;
        for (let i = 0; i < bug; i++) {
            this.spawnEnemy('bug', spawnedCount++, totalEnemies, healthMultiplier, damageMultiplier);
        }
        for (let i = 0; i < armoredBug; i++) {
            this.spawnEnemy('armoredBug', spawnedCount++, totalEnemies, healthMultiplier, damageMultiplier);
        }
        for (let i = 0; i < watchtower; i++) {
            this.spawnEnemy('watchtower', spawnedCount++, totalEnemies, healthMultiplier, damageMultiplier);
        }

        this.game.ui.updateWaveStats(1, totalEnemies);
    }

    spawnEnemy(type, index, totalEnemies, healthMultiplier, damageMultiplier) {
        const angle = (index / totalEnemies) * Math.PI * 2;
        const spawnRadius = 20;
        const x = this.arenaCenter.x + Math.cos(angle) * spawnRadius;
        const z = this.arenaCenter.z + Math.sin(angle) * spawnRadius;
        const spawnPoint = new BABYLON.Vector3(x, 0.5, z);

        let newEnemy;
        if (type === 'bug') {
            newEnemy = new Bug(this.game, spawnPoint, healthMultiplier, damageMultiplier);
        } else if (type === 'armoredBug') {
            newEnemy = new ArmoredBug(this.game, spawnPoint, healthMultiplier, damageMultiplier);
        } else if (type === 'watchtower') {
            newEnemy = new Watchtower(this.game, spawnPoint, healthMultiplier, damageMultiplier);
        }
        this.enemies.push(newEnemy);
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            this.game.ui.updateWaveStats(1, this.enemies.length);
        }
    }

    giveRewards() {
        const reward = this.currentCombatConfig.reward;
        console.log("Combat finished! Giving rewards:", reward);
        this.game.addGold(reward.gold * this.game.goldMultiplier);
    }
}