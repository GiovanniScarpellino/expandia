import * as BABYLON from '@babylonjs/core';
import { Bug } from '../babylon/Bug.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.enemies = [];
        this.waveNumber = 0;
        this.enemiesPerWave = 5;
        this.spawnRadius = 20;
        this.timeBetweenWaves = 3000; // 3 seconds
        this.waveTimer = 0;
        this.isWaveActive = false;
        this.arenaCenter = null;
    }

    start(arenaCenter) {
        this.arenaCenter = arenaCenter;
        this.waveNumber = 1;
        this.isWaveActive = false; // Will be set to true by the first wave spawn
        this.waveTimer = this.timeBetweenWaves; // Start first wave almost immediately
        console.log("EnemyManager started for arena combat.");
    }

    stop() {
        // Despawn all enemies
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
        this.waveNumber = 0;
        this.isWaveActive = false;
        this.arenaCenter = null;
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
            this.isWaveActive = false;
            this.waveTimer = 0;
            this.waveNumber++;
            // For now, let's say combat ends after 3 waves
            if (this.waveNumber > 3) {
                this.game.endCombat();
                return;
            }
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
        const enemiesToSpawn = this.enemiesPerWave + (this.waveNumber - 1) * 2; // Increase enemies per wave

        for (let i = 0; i < enemiesToSpawn; i++) {
            const angle = (i / enemiesToSpawn) * Math.PI * 2;
            const x = this.arenaCenter.x + Math.cos(angle) * this.spawnRadius;
            const z = this.arenaCenter.z + Math.sin(angle) * this.spawnRadius;
            const spawnPoint = new BABYLON.Vector3(x, 0.5, z);
            this.spawnEnemy(spawnPoint);
        }
        this.game.ui.updateWaveStats(this.waveNumber, enemiesToSpawn);
    }

    spawnEnemy(position) {
        const newEnemy = new Bug(this.game, position);
        this.enemies.push(newEnemy);
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            this.game.ui.updateWaveStats(this.waveNumber, this.enemies.length);
        }
    }
}
