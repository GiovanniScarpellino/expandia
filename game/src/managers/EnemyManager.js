import { Bug } from '../babylon/Bug.js';
import { Watchtower } from '../babylon/Watchtower.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.enemies = [];
        this.waveNumber = 0;
        this.timeBetweenWaves = 5000; // 5 seconds
        this.nextWaveTime = 0;
        this.isWaveInProgress = false;
    }

    start() {
        // Start the first wave almost immediately
        this.nextWaveTime = Date.now() + 1000;
        this.game.ui.updateWaveStats(this.waveNumber, 0);
    }

    update(delta) {
        // Update all active enemies
        for (const enemy of this.enemies) {
            enemy.update(delta);
        }

        // Check for wave completion
        if (this.isWaveInProgress && this.enemies.length === 0) {
            this.isWaveInProgress = false;
            this.nextWaveTime = Date.now() + this.timeBetweenWaves;
            console.log(`Wave ${this.waveNumber} cleared! Next wave in ${this.timeBetweenWaves / 1000}s.`);
        }

        // Check if it's time to spawn a new wave
        if (!this.isWaveInProgress && Date.now() >= this.nextWaveTime) {
            this.waveNumber++;
            this.spawnWave();
            this.isWaveInProgress = true;
        }

        // Update UI
        this.game.ui.updateWaveStats(this.waveNumber, this.enemies.length);
    }

    spawnWave() {
        const bugCount = 2 + this.waveNumber;
        const watchtowerCount = Math.floor(this.waveNumber / 2);

        console.log(`Spawning wave ${this.waveNumber} with ${bugCount} bug(s) and ${watchtowerCount} watchtower(s)...`);
        
        const spawnPoints = this.game.world.getSpawnPoints(bugCount + watchtowerCount);
        if (spawnPoints.length === 0) {
            console.warn("EnemyManager: No valid spawn points found.");
            return;
        }

        // Spawn Bugs
        for (let i = 0; i < bugCount; i++) {
            const spawnPoint = spawnPoints.pop();
            if (spawnPoint) {
                const bug = new Bug(this.game, spawnPoint);
                this.enemies.push(bug);
            }
        }

        // Spawn Watchtowers
        for (let i = 0; i < watchtowerCount; i++) {
            const spawnPoint = spawnPoints.pop();
            if (spawnPoint) {
                const tower = new Watchtower(this.game, spawnPoint);
                this.enemies.push(tower);
            }
        }
    }

    removeEnemy(enemyToRemove) {
        const index = this.enemies.findIndex(enemy => enemy === enemyToRemove);
        if (index !== -1) {
            this.enemies.splice(index, 1);
        }
    }
}
