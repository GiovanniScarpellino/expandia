import * as THREE from 'three';

export class World {
    yOffset = -0.5;

    constructor(scene) {
        this.scene = scene;
        this.tileSize = 2;
        this.tiles = {};
        this.obstacles = new Set(); // Stores keys of occupied tiles for non-wall objects
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

    addObstacle(mesh) {
        mesh.geometry.computeBoundingBox();
        const box = new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);

        const min = this.getTileCoordinates(box.min);
        const max = this.getTileCoordinates(box.max);

        for (let x = min.x; x <= max.x; x++) {
            for (let z = min.z; z <= max.z; z++) {
                const key = this.getTileKey(x, z);
                this.obstacles.add(key);
            }
        }
    }

    removeObstacle(mesh) {
        mesh.geometry.computeBoundingBox();
        const box = new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);

        const min = this.getTileCoordinates(box.min);
        const max = this.getTileCoordinates(box.max);

        for (let x = min.x; x <= max.x; x++) {
            for (let z = min.z; z <= max.z; z++) {
                const key = this.getTileKey(x, z);
                this.obstacles.delete(key);
            }
        }
    }

    isValidPlacement(position) {
        const { x, z } = this.getTileCoordinates(position);
        const key = this.getTileKey(x, z);
        const tile = this.tiles[key];
        return tile && tile.userData.unlocked && !this.obstacles.has(key);
    }

    canMoveTo(position, walls = []) {
        // 1. Check tile validity (unlocked, not an obstacle like a rock)
        const { x, z } = this.getTileCoordinates(position);
        const key = this.getTileKey(x, z);
        const tile = this.tiles[key];
        if (!tile || !tile.userData.unlocked || this.obstacles.has(key)) {
            return false;
        }

        // 2. Check for collision with walls
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            position,
            new THREE.Vector3(0.5, 1, 0.5) // Player's approximate bounding box
        );

        for (const wall of walls) {
            const wallBox = new THREE.Box3().setFromObject(wall.mesh);
            if (playerBox.intersectsBox(wallBox)) {
                return false;
            }
        }

        return true;
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
