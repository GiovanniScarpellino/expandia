import * as BABYLON from '@babylonjs/core';
import { Bug } from '../babylon/Bug.js';
import { ArmoredBug } from '../babylon/ArmoredBug.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.enemies = [];
        this.waveNumber = 0;
        this.timeBetweenWaves = 3000; // 3 seconds
        this.waveTimer = 0;
        this.isWaveActive = false;
        this.arenaCenter = null;

        // Combat configuration based on heart fragments
        this.combatConfigurations = [
            // 0 fragments (First combat)
            {
                totalWaves: 2,
                waves: [
                    { bug: 5, armoredBug: 0 },
                    { bug: 8, armoredBug: 0 },
                ],
                reward: { gold: 50, wood: 20, stone: 10 }
            },
            // 1 fragment
            {
                totalWaves: 3,
                waves: [
                    { bug: 10, armoredBug: 0 },
                    { bug: 7, armoredBug: 2 },
                    { bug: 10, armoredBug: 3 },
                ],
                reward: { gold: 75, wood: 30, stone: 15 }
            },
            // 2 fragments
            {
                totalWaves: 3,
                waves: [
                    { bug: 12, armoredBug: 2 },
                    { bug: 10, armoredBug: 5 },
                    { bug: 15, armoredBug: 7 },
                ],
                reward: { gold: 100, wood: 40, stone: 20 }
            },
            // Add more configurations for more fragments
        ];
        this.currentCombatConfig = null;
    }

    start(arenaCenter, difficulty) {
        this.arenaCenter = arenaCenter;
        this.waveNumber = 1;
        this.isWaveActive = false; // Will be set to true by the first wave spawn
        this.waveTimer = this.timeBetweenWaves; // Start first wave almost immediately
        
        // Select combat configuration based on difficulty (number of heart fragments)
        this.currentCombatConfig = this.combatConfigurations[difficulty] || this.combatConfigurations[this.combatConfigurations.length - 1];

        console.log(`EnemyManager started for arena combat. Difficulty: ${difficulty}`);
    }

    stop() {
        // Despawn all enemies
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
        this.waveNumber = 0;
        this.isWaveActive = false;
        this.arenaCenter = null;
        this.currentCombatConfig = null;
        console.log("EnemyManager stopped.");
    }

    update(delta) {
        if (!this.arenaCenter) return; // Don't run if combat isn't active

        // Update all active enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].isDisposed) {
                this.enemies.splice(i, 1);
            } else {
                this.enemies[i].update(delta);
            }
        }

        // If a wave is active and all enemies are defeated, prepare for the next wave
        if (this.isWaveActive && this.enemies.length === 0) {
            if (this.waveNumber >= this.currentCombatConfig.totalWaves) {
                // Combat finished, give rewards and end
                this.giveRewards();
                this.game.endCombat();
                return;
            }
            this.isWaveActive = false;
            this.waveTimer = 0;
            this.waveNumber++;
        }

        // If no wave is active, count down to the next one
        if (!this.isWaveActive) {
            this.waveTimer += delta * 1000;
            if (this.waveTimer >= this.timeBetweenWaves) {
                this.spawnWave();
            }
        }
    }

    spawnWave() {
        console.log(`Spawning Wave ${this.waveNumber}`);
        this.isWaveActive = true;
        
        const waveConfig = this.currentCombatConfig.waves[this.waveNumber - 1];
        const bugCount = waveConfig.bug || 0;
        const armoredBugCount = waveConfig.armoredBug || 0;
        const totalEnemies = bugCount + armoredBugCount;

        let spawnedCount = 0;
        for (let i = 0; i < bugCount; i++) {
            this.spawnEnemy('bug', spawnedCount++, totalEnemies);
        }
        for (let i = 0; i < armoredBugCount; i++) {
            this.spawnEnemy('armoredBug', spawnedCount++, totalEnemies);
        }

        this.game.ui.updateWaveStats(this.waveNumber, totalEnemies);
    }

    spawnEnemy(type, index, totalEnemies) {
        const angle = (index / totalEnemies) * Math.PI * 2;
        const spawnRadius = 20;
        const x = this.arenaCenter.x + Math.cos(angle) * spawnRadius;
        const z = this.arenaCenter.z + Math.sin(angle) * spawnRadius;
        const spawnPoint = new BABYLON.Vector3(x, 0.5, z);

        let newEnemy;
        if (type === 'bug') {
            newEnemy = new Bug(this.game, spawnPoint);
        } else if (type === 'armoredBug') {
            newEnemy = new ArmoredBug(this.game, spawnPoint);
        }
        this.enemies.push(newEnemy);
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            this.game.ui.updateWaveStats(this.waveNumber, this.enemies.length);
        }
    }

    giveRewards() {
        const reward = this.currentCombatConfig.reward;
        console.log("Combat finished! Giving rewards:", reward);
        this.game.heartFragments++;
        this.game.addGold(reward.gold);
        this.game.addResource('tree', reward.wood);
        this.game.addResource('rock', reward.stone);
    }
}
