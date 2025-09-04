import * as BABYLON from '@babylonjs/core';
import { Enemy } from '../babylon/Enemy.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.enemies = [];
        this.waveInterval = null;
    }

    startWave(waveNumber) {
        console.log(`Starting wave ${waveNumber}`);
        this.stopWave(); // Stop any previous wave

        const enemyCount = 5 + waveNumber; // Increase enemies per wave
        let spawnedCount = 0;

        this.waveInterval = setInterval(() => {
            if (spawnedCount >= enemyCount) {
                this.stopWave();
                return;
            }
            this.spawnEnemy();
            spawnedCount++;
        }, 2000); // Spawn an enemy every 2 seconds
    }

    stopWave() {
        if (this.waveInterval) {
            clearInterval(this.waveInterval);
            this.waveInterval = null;
        }
    }

    despawnAll() {
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
    }

    spawnEnemy() {
        const spawnPosition = this.findValidSpawnPosition();
        if (!spawnPosition) {
            console.warn("Could not find a valid spawn position for an enemy.");
            return;
        }

        const modelData = this.game.models.player; // Using player model as placeholder
        const newMesh = modelData.mesh.clone(`enemy_${this.enemies.length}`);
        newMesh.position = spawnPosition;

        const enemy = new Enemy(this.game, this.scene, newMesh, modelData.animationGroups);
        this.enemies.push(enemy);
        this.game.addShadowCaster(newMesh); // Make enemies cast shadows
    }

    findValidSpawnPosition() {
        const unlockedTiles = Object.values(this.game.world.tiles).filter(t => t.metadata.unlocked);
        const lockedBorderTiles = [];

        const offsets = [{x: 1, z: 0}, {x: -1, z: 0}, {x: 0, z: 1}, {x: 0, z: -1}];

        for (const tile of unlockedTiles) {
            const { x, z } = tile.metadata;
            for (const offset of offsets) {
                const key = this.game.world.getTileKey(x + offset.x, z + offset.z);
                if (this.game.world.tiles[key] && !this.game.world.tiles[key].metadata.unlocked) {
                    lockedBorderTiles.push(this.game.world.tiles[key]);
                }
            }
        }

        if (lockedBorderTiles.length === 0) {
            // Fallback if no border tiles found (e.g. start of game)
            return new BABYLON.Vector3(5, 0, 5);
        }

        const randomTile = lockedBorderTiles[Math.floor(Math.random() * lockedBorderTiles.length)];
        return randomTile.position.clone();
    }

    update(delta) {
        const target = this.game.base; // Enemies target the base
        if (!target) return;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(target, delta);

            if (enemy.isReadyToBeRemoved) {
                // Optional: Add quest progress logic here if needed
                enemy.dispose();
                this.enemies.splice(i, 1);
            }
        }
    }
}
