import * as THREE from 'three';

export class World {
    yOffset = -0.5;

    constructor(scene) {
        this.scene = scene;
        this.tileSize = 2;
        this.tiles = {};
        this.unlockedMaterial = new THREE.MeshStandardMaterial({ color: 0x556B2F });
        this.lockedMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });
    }

    init() {
        this.createTile(0, 0, true);
        this.createTile(0, 1, false);
        this.createTile(0, -1, false);
        this.createTile(1, 0, false);
        this.createTile(-1, 0, false);
    }

    loadState(tilesData) {
        tilesData.forEach(tileData => {
            this.createTile(tileData.x, tileData.z, tileData.unlocked);
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
        const { x, z } = this.getTileCoordinates(position);
        const key = this.getTileKey(x, z);
        return this.tiles[key] && this.tiles[key].userData.unlocked;
    }

    createTile(x, z, unlocked = false) {
        const key = this.getTileKey(x, z);
        if (this.tiles[key]) {
            return { tile: this.tiles[key], isNew: false };
        }

        const tileGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
        const tile = new THREE.Mesh(tileGeometry, unlocked ? this.unlockedMaterial : this.lockedMaterial);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x * this.tileSize, this.yOffset, z * this.tileSize);
        tile.receiveShadow = true;
        tile.userData = { unlocked, x, z };
        this.scene.add(tile);
        this.tiles[key] = tile;
        return { tile: tile, isNew: true };
    }

    unlockTile(tile) {
        tile.material = this.unlockedMaterial;
        tile.userData.unlocked = true;

        const { x, z } = tile.userData;
        const newTilesInfo = [];
        const results = [
            this.createTile(x + 1, z, false),
            this.createTile(x - 1, z, false),
            this.createTile(x, z + 1, false),
            this.createTile(x, z - 1, false)
        ];

        results.forEach(result => {
            newTilesInfo.push({ coords: result.tile.userData, isNew: result.isNew });
        });

        return newTilesInfo;
    }
}
