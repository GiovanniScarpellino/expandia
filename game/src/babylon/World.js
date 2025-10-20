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
        const platformRadius = 5; // Creates an 11x11 platform

        for (let x = -platformRadius; x <= platformRadius; x++) {
            for (let z = -platformRadius; z <= platformRadius; z++) {
                this.createTile(x, z, true); // Create all tiles as unlocked
            }
        }
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

        tile.metadata = { unlocked, x, z };
        this.tiles[key] = tile;

        return tile;
    }
}
