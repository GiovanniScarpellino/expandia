import { Bug } from '../babylon/Bug.js';

export class BugManager {
    constructor(game) {
        this.game = game;
        this.bugs = [];
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
        // Update all active bugs
        for (const bug of this.bugs) {
            bug.update(delta);
        }

        // Check for wave completion
        if (this.isWaveInProgress && this.bugs.length === 0) {
            this.isWaveInProgress = false;
            this.nextWaveTime = Date.now() + this.timeBetweenWaves;
            console.log(`Wave ${this.waveNumber} cleared! Next wave in ${this.timeBetweenWaves / 1000}s.`);
        }

        // Check if it's time to spawn a new wave
        if (!this.isWaveInProgress && Date.now() >= this.nextWaveTime) {
            this.waveNumber++;
            const waveSize = 2 + this.waveNumber; // Simple scaling: 3, 4, 5, ...
            this.spawnBugWave(waveSize);
            this.isWaveInProgress = true;
        }

        // Update UI
        this.game.ui.updateWaveStats(this.waveNumber, this.bugs.length);
    }

    spawnBugWave(count) {
        console.log(`Spawning wave ${this.waveNumber} with ${count} bug(s)...`);
        const spawnPoints = this.game.world.getSpawnPoints(count);

        if (spawnPoints.length === 0) {
            console.warn("BugManager: No valid spawn points found.");
            return;
        }

        for (let i = 0; i < count; i++) {
            // Cycle through spawn points if there aren't enough unique ones
            const spawnPoint = spawnPoints[i % spawnPoints.length];
            const bug = new Bug(this.game, spawnPoint);
            this.bugs.push(bug);
        }
    }

    removeBug(bugToRemove) {
        const index = this.bugs.findIndex(bug => bug === bugToRemove);
        if (index !== -1) {
            this.bugs.splice(index, 1);
        }
    }
}
