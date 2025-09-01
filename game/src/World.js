import * as THREE from 'three';

export class World {
    constructor(scene, resourceManager, enemyManager) {
        this.scene = scene;
        this.resourceManager = resourceManager;
        this.enemyManager = enemyManager;
        this.tileSize = 2;
        this.tiles = {};
        this.unlockedMaterial = new THREE.MeshStandardMaterial({ color: 0x556B2F });
        this.lockedMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });

        this.createTile(0, 0, true);
        this.createTile(0, 1, false);
        this.createTile(0, -1, false);
        this.createTile(1, 0, false);
        this.createTile(-1, 0, false);

        this.resourceManager.createResource('tree', new THREE.Vector3(0.5, -0.25, 0.5));
        this.resourceManager.createResource('rock', new THREE.Vector3(-0.5, -0.3, 0.5));
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
        return this.tiles[key] && this.tiles[key].userData.unlocked;
    }

    createTile(x, z, unlocked = false) {
        const key = this.getTileKey(x, z);
        if (this.tiles[key]) {
            return this.tiles[key];
        }

        const tileGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
        const tile = new THREE.Mesh(tileGeometry, unlocked ? this.unlockedMaterial : this.lockedMaterial);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x * this.tileSize, -0.5, z * this.tileSize);
        tile.receiveShadow = true;
        tile.userData = { unlocked, x, z };
        this.scene.add(tile);
        this.tiles[key] = tile;

        if (!unlocked) {
            if (Math.random() < 0.2) {
                this.resourceManager.createResource('tree', new THREE.Vector3(tile.position.x, -0.25, tile.position.z));
            }
            if (Math.random() < 0.1) {
                this.resourceManager.createResource('rock', new THREE.Vector3(tile.position.x, -0.3, tile.position.z));
            }
            if (Math.random() < 0.05) {
                this.enemyManager.createEnemy(new THREE.Vector3(tile.position.x, -0.2, tile.position.z));
            }
        }
        return tile;
    }

    unlockTile(tile) {
        tile.material = this.unlockedMaterial;
        tile.userData.unlocked = true;

        const { x, z } = tile.userData;
        this.createTile(x + 1, z, false);
        this.createTile(x - 1, z, false);
        this.createTile(x, z + 1, false);
        this.createTile(x, z - 1, false);
    }
}
