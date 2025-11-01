import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';
import { Interactable } from './Interactable.js';

export class World {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;
        this.tileSize = 2;
        this.tiles = {};
        this.tilesUnlockedSinceLastResource = 0;

        this.unlockedMaterial = new BABYLON.StandardMaterial("unlockedMat", scene);
        this.unlockedMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.7); // A neutral grey
        this.unlockedMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        this.lockedMaterial = new BABYLON.StandardMaterial("lockedMat", scene);
        this.lockedMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
        this.lockedMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    }

    init() {
        // Create a larger 7x7 starting area
        for (let x = -3; x <= 3; x++) {
            for (let z = -3; z <= 3; z++) {
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
                return; // Not enough resources
            }
            this.game.addResource('tree', -cost);
        }

        // If tile doesn't exist, create it. If it exists but is locked, get it.
        const targetTile = this.createTile(x, z, true); // Create/update the tile as unlocked

        // Create new locked neighbors where necessary
        this.createNeighboringLockedTiles(x, z);
        
        // Refresh the interactable state of all neighbors of the newly unlocked tile
        this.updateNeighboringTiles(x, z);


        // --- Fairer Resource Spawning Logic ---
        if (withCost) {
            this.tilesUnlockedSinceLastResource++;
            const resourceSpawnInterval = 3; // Guarantee a resource every 3 tiles

            if (this.tilesUnlockedSinceLastResource >= resourceSpawnInterval) {
                const resourceType = (this.tilesUnlockedSinceLastResource % 2 === 0) ? 'tree' : 'rock'; // Alternate types
                this.game.resourceManager.spawnResource(targetTile.position, resourceType);
                this.tilesUnlockedSinceLastResource = 0; // Reset counter
            }
        }
    }

    createNeighboringLockedTiles(x, z) {
        const neighbors = [{ dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 }];
        neighbors.forEach(n => {
            // This will create a new locked tile only if one doesn't already exist.
            this.createTile(x + n.dx, z + n.dz, false);
        });
    }

    updateNeighboringTiles(x, z) {
        const neighbors = [
            { dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
            { dx: 1, dz: 1 }, { dx: -1, dz: -1 }, { dx: 1, dz: -1 }, { dx: -1, dz: 1 } // Also check diagonals for their own updates
        ];
        neighbors.forEach(n => {
            const nx = x + n.dx;
            const nz = z + n.dz;
            const neighborKey = this.getTileKey(nx, nz);
            const neighborTile = this.tiles[neighborKey];

            // If the neighbor is a locked tile, refresh its interactable state
            if (neighborTile && !neighborTile.metadata.unlocked) {
                this.updateLockedTileInteractable(nx, nz);
            }
        });
    }

    isAdjacentToUnlocked(x, z) {
        const neighbors = [{ dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 }];
        for (const n of neighbors) {
            const key = this.getTileKey(x + n.dx, z + n.dz);
            const tile = this.tiles[key];
            if (tile && tile.metadata.unlocked) {
                return true;
            }
        }
        return false;
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

    updateLockedTileInteractable(x, z) {
        const key = this.getTileKey(x, z);
        const tile = this.tiles[key];

        if (!tile || tile.metadata.unlocked) return;

        const shouldBeInteractable = this.isAdjacentToUnlocked(x, z);

        if (shouldBeInteractable && !tile.metadata.interactable) {
            // Add interactable
            const highlightBox = BABYLON.MeshBuilder.CreateBox(`highlight-${key}`, {
                width: this.tileSize * 0.9, 
                depth: this.tileSize * 0.9, 
                height: 0.1 
            }, this.scene);
            highlightBox.position = tile.position.clone();
            highlightBox.position.y = 0.5; // Adjusted Y position
            highlightBox.isPickable = false;
            highlightBox.isVisible = false; // Hide for final version
            highlightBox.metadata = { isHighlightMesh: true };

            const interactionBox = BABYLON.MeshBuilder.CreateBox(`interaction-${key}`, {
                width: this.tileSize,
                depth: this.tileSize,
                height: 0.2
            }, this.scene);
            interactionBox.position = tile.position.clone();
            interactionBox.position.y = 0.5; // Adjusted Y position
            interactionBox.isPickable = true;
            interactionBox.isVisible = false; // Hide for final version

            tile.metadata.interactable = new Interactable(interactionBox, 3, () => {
                this.unlockTile(x, z, true);
            }, highlightBox);

        } else if (!shouldBeInteractable && tile.metadata.interactable) {
            // Remove interactable
            if (this.game.interactionManager.currentTarget === tile.metadata.interactable) {
                this.game.interactionManager.clearTarget();
            }
            tile.metadata.interactable.mesh.dispose(); // dispose interactionBox
            tile.metadata.interactable.visualMesh.dispose(); // dispose highlightBox
            tile.metadata.interactable = null;
        }
    }


    createTile(x, z, unlocked = false) {
        const key = this.getTileKey(x, z);
        const existingTile = this.tiles[key];

        if (existingTile) {
            // If we're trying to unlock an existing locked tile
            if (unlocked && !existingTile.metadata.unlocked) {
                existingTile.material = this.unlockedMaterial;
                existingTile.metadata.unlocked = true;
                
                // Make it no longer interactable
                if (existingTile.metadata.interactable) {
                    if (this.game.interactionManager.currentTarget === existingTile.metadata.interactable) {
                        this.game.interactionManager.clearTarget();
                    }
                    existingTile.metadata.interactable.mesh.dispose();
                    existingTile.metadata.interactable.visualMesh.dispose();
                    existingTile.metadata.interactable = null;
                }
            }
            return existingTile;
        }

        // --- Create new tile if it doesn't exist ---
        const tile = BABYLON.MeshBuilder.CreatePlane(key, { size: this.tileSize }, this.scene);
        const tilePosition = new BABYLON.Vector3(x * this.tileSize, 0, z * this.tileSize);
        tile.position = tilePosition;
        tile.rotation.x = Math.PI / 2;
        tile.material = unlocked ? this.unlockedMaterial : this.lockedMaterial;
        tile.receiveShadows = true;
        tile.checkCollisions = true;
        tile.isPickable = false; // The ground plane itself is never pickable
        tile.collisionGroup = COLLISION_GROUPS.TERRAIN;
        tile.collisionMask = COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.NPC;

        tile.metadata = { type: 'tile', unlocked, x, z, interactable: null };
        this.tiles[key] = tile;

        if (!unlocked) {
            // A new locked tile is only interactable if it's next to an unlocked one.
            this.updateLockedTileInteractable(x, z);
        }

        return tile;
    }
}
