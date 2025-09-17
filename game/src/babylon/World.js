
import * as BABYLON from '@babylonjs/core';
import { Lamppost } from './Lamppost.js';

export class World {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;
        this.tileSize = 2;
        this.tiles = {};
        this.lampposts = [];

        this.unlockedMaterial = new BABYLON.StandardMaterial("unlockedMat", scene);
        this.unlockedMaterial.diffuseColor = new BABYLON.Color3(0.33, 0.42, 0.18); // DarkOliveGreen
        this.unlockedMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        this.lockedMaterial = new BABYLON.StandardMaterial("lockedMat", scene);
        this.lockedMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // DarkGrey
        this.lockedMaterial.specularColor = new BABYLON.Color3(0, 0, 0); // Remove reflections
        this.lockedMaterial.alpha = 0.5;
    }

    init() {
        this.createTile(0, 0, true);
        this.createTile(0, 1, false);
        this.createTile(0, -1, true); // Unlock the tile under the base
        this.createTile(1, 0, false);
        this.createTile(-1, 0, false);
    }

    getTileKey(x, z) {
        return `${x},${z}`;
    }

    getTileCoordinates(position) {
        const x = Math.round(position.x / this.tileSize);
        const z = Math.round(position.z / this.tileSize);
        return { x, z };
    }

    canMoveTo(position) {
        const { x, z } = this.getTileCoordinates(position);
        const key = this.getTileKey(x, z);
        const tile = this.tiles[key];
        return tile && tile.metadata.unlocked;
    }

    isPositionNearUnlockedTile(position) {
        const { x, z } = this.getTileCoordinates(position);
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const key = this.getTileKey(x + i, z + j);
                const tile = this.tiles[key];
                if (tile && tile.metadata.unlocked) {
                    return true;
                }
            }
        }
        return false;
    }

    getSpawnPoints() {
        const spawnPoints = [];
        const checkedNeighbors = new Set();

        for (const key in this.tiles) {
            const tile = this.tiles[key];
            if (tile.metadata.unlocked) {
                const { x, z } = tile.metadata;
                
                // Check neighbors
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;

                        const neighborKey = this.getTileKey(x + i, z + j);
                        if (checkedNeighbors.has(neighborKey)) continue;
                        
                        const neighborTile = this.tiles[neighborKey];
                        // A spawn point is a non-unlocked tile adjacent to an unlocked one
                        if (!neighborTile || !neighborTile.metadata.unlocked) {
                            // We add the position of the *unlocked* tile as a starting point
                            // The NPC will spawn just outside it.
                            const spawnPosition = tile.position.clone();
                            // Add a small offset to spawn outside the unlocked tile
                            spawnPosition.x += i * this.tileSize * 0.6;
                            spawnPosition.z += j * this.tileSize * 0.6;
                            spawnPoints.push(spawnPosition);
                        }
                        checkedNeighbors.add(neighborKey);
                    }
                }
            }
        }
        // Return unique positions
        const uniquePositions = [];
        const positionSet = new Set();
        for(const pos of spawnPoints) {
            const key = `${pos.x.toFixed(1)},${pos.z.toFixed(1)}`;
            if (!positionSet.has(key)) {
                uniquePositions.push(pos);
                positionSet.add(key);
            }
        }
        return uniquePositions;
    }

    createTile(x, z, unlocked = false) {
        const key = this.getTileKey(x, z);
        if (this.tiles[key]) {
            return { tile: this.tiles[key], isNew: false };
        }

        const tile = BABYLON.MeshBuilder.CreatePlane(key, { size: this.tileSize }, this.scene);
        const tilePosition = new BABYLON.Vector3(x * this.tileSize, 0, z * this.tileSize);
        tile.position = tilePosition;
        tile.rotation.x = Math.PI / 2;
        tile.material = unlocked ? this.unlockedMaterial : this.lockedMaterial;
        tile.receiveShadows = true;
        tile.checkCollisions = true;

        tile.metadata = { unlocked, x, z };
        this.tiles[key] = tile;

        // Create lamppost only on the center tile
        if (x === 0 && z === 0) {
            const lamppost = new Lamppost(this.scene, tilePosition);
            this.lampposts.push(lamppost);
        }

        return { tile: tile, isNew: true };
    }

    unlockTile(tile) {
        if (!tile || tile.metadata.unlocked) return [];

        tile.material = this.unlockedMaterial;
        tile.metadata.unlocked = true;

        const { x, z } = tile.metadata;
        const results = [
            this.createTile(x + 1, z, false),
            this.createTile(x - 1, z, false),
            this.createTile(x, z + 1, false),
            this.createTile(x, z - 1, false)
        ];

        results.forEach(result => {
            if (result.isNew) {
                const tilePos = result.tile.position;
                if (Math.random() < 0.2) {
                    const pos = tilePos.clone().add(new BABYLON.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).scale(this.tileSize * 0.8));
                    this.game.resourceManager.createResource('tree', pos);
                }
                if (Math.random() < 0.1) {
                    const pos = tilePos.clone().add(new BABYLON.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).scale(this.tileSize * 0.8));
                    this.game.resourceManager.createResource('rock', pos);
                }
            }
        });
    }
}
