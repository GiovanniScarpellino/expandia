import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';

export class World {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;
        this.tileSize = 2;
        this.tiles = {};

        this.unlockedMaterial = new BABYLON.StandardMaterial("unlockedMat", scene);
        this.unlockedMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.7); // A neutral grey
        this.unlockedMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        this.lockedMaterial = new BABYLON.StandardMaterial("lockedMat", scene);
        this.lockedMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
        this.lockedMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    }

    init() {
        // Create a larger 5x5 starting area
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                this.unlockTile(x, z, false); // Unlock initial tiles without cost
            }
        }

        // Guarantee some starting resources
        this.game.resourceManager.spawnResource(this.tiles[this.getTileKey(1, 1)].position, 'tree');
        this.game.resourceManager.spawnResource(this.tiles[this.getTileKey(-1, -1)].position, 'rock');
    }

    unlockTile(x, z, withCost = true) {
        const key = this.getTileKey(x, z);
        const tile = this.tiles[key];

        if (tile && tile.metadata.unlocked) {
            return; // Already unlocked
        }

        if (withCost) {
            const cost = 1; // Lowered initial cost
            if (this.game.wood < cost) {
                console.log("Not enough wood to unlock tile!");
                return; // Not enough resources
            }
            this.game.addResource('tree', -cost);
        }

        // If tile doesn't exist, create it. If it exists but is locked, get it.
        const targetTile = this.createTile(x, z, true); // Create/update the tile as unlocked

        // Create locked neighbors
        this.createNeighboringLockedTiles(x, z);

        // Procedurally spawn resources on new tiles
        if (withCost && Math.random() < 0.3) { // 30% chance
            this.game.resourceManager.spawnResource(targetTile.position);
        }


    }

    createNeighboringLockedTiles(x, z) {
        const neighbors = [{ dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 }];
        neighbors.forEach(n => {
            this.createTile(x + n.dx, z + n.dz, false); // Creates a locked tile if it doesn't exist
        });
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
        // Check not just the center, but the corners of the player's approximate hitbox
        const hitboxSize = 0.5; // Should match player's hitbox width/depth
        const halfSize = hitboxSize / 2;

        const positionsToCheck = [
            position, // Center
            new BABYLON.Vector3(position.x + halfSize, position.y, position.z + halfSize), // Top-Right
            new BABYLON.Vector3(position.x - halfSize, position.y, position.z + halfSize), // Top-Left
            new BABYLON.Vector3(position.x + halfSize, position.y, position.z - halfSize), // Bottom-Right
            new BABYLON.Vector3(position.x - halfSize, position.y, position.z - halfSize)  // Bottom-Left
        ];

        for (const pos of positionsToCheck) {
            const { x, z } = this.getTileCoordinates(pos);
            const key = this.getTileKey(x, z);
            const tile = this.tiles[key];
            if (!tile || !tile.metadata.unlocked) {
                return false; // If any point is on an invalid or locked tile, movement is disallowed
            }
        }

        return true;
    }

    getSpawnPoints(count) {
        const spawnPoints = [];
        const platformRadius = 5; // Must match the init radius
        const spawnRadius = platformRadius + 1;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * spawnRadius * this.tileSize;
            const z = Math.sin(angle) * spawnRadius * this.tileSize;
            spawnPoints.push(new BABYLON.Vector3(x, 0.5, z));
        }
        return spawnPoints;
    }

    createTile(x, z, unlocked = false) {
        const key = this.getTileKey(x, z);
        if (this.tiles[key]) {
            // If we're trying to unlock an existing locked tile
            if (unlocked && !this.tiles[key].metadata.unlocked) {
                this.tiles[key].material = this.unlockedMaterial;
                this.tiles[key].metadata.unlocked = true;
            }
            return this.tiles[key];
        }

        const tile = BABYLON.MeshBuilder.CreatePlane(key, { size: this.tileSize }, this.scene);
        const tilePosition = new BABYLON.Vector3(x * this.tileSize, 0, z * this.tileSize);
        tile.position = tilePosition;
        tile.rotation.x = Math.PI / 2;
        tile.material = unlocked ? this.unlockedMaterial : this.lockedMaterial;
        tile.receiveShadows = true;
        tile.checkCollisions = true;
        tile.collisionGroup = COLLISION_GROUPS.TERRAIN;
        tile.collisionMask = COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.NPC;

        tile.metadata = { type: 'tile', unlocked, x, z };
        this.tiles[key] = tile;

        return tile;
    }
}
