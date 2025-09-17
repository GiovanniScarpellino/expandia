import * as BABYLON from '@babylonjs/core';
import { Wall } from '../babylon/Wall.js';
import { Lamppost } from '../babylon/Lamppost.js';

export class BuildingManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;

        // State
        this.isBuildingMode = false;
        this.isPlacing = false;
        this.currentItemType = null;
        this.canPlace = false;
        this.buildings = []; // Keep track of all buildings

        // Ghost Mesh
        this.ghostMesh = null;
        this.placementRotation = 0;

        // Costs
        this.itemCosts = {
            wall: { wood: 5, stone: 0 },
            lamppost: { wood: 5, stone: 2 }
        };
    }

    dispose() {
        // No persistent listeners to clean up anymore
    }

    toggleBuildMode(isOpen) {
        this.isBuildingMode = isOpen;
        this.game.setPaused(isOpen);

        if (isOpen) {
            this.game.canvas.focus();
            this.game.freeCameraTarget.copyFrom(this.game.player.hitbox.position);
        } else {
            this.cancelPlacement();
        }
    }

    selectItemToPlace(itemType) {
        if (!this.isBuildingMode || this.isPlacing) return;

        const cost = this.itemCosts[itemType];
        if (this.game.wood < cost.wood || this.game.stone < cost.stone) {
            console.log("Not enough resources.");
            return;
        }

        this.isPlacing = true;
        this.currentItemType = itemType;
        this.createGhostMesh(itemType);
        this.game.ui.buildMenu.style.display = 'none'; // Just hide the menu
    }

    cancelPlacement() {
        if (!this.isPlacing) return;
        this.isPlacing = false;
        this.currentItemType = null;
        this.destroyGhostMesh();
        if (this.isBuildingMode) {
            this.game.ui.buildMenu.style.display = 'block'; // Show menu again
        }
    }

    confirmPlacement() {
        if (!this.isPlacing || !this.canPlace) {
            return;
        }

        const cost = this.itemCosts[this.currentItemType];
        if (this.game.wood >= cost.wood && this.game.stone >= cost.stone) {
            this.game.addResource('tree', -cost.wood);
            this.game.addResource('rock', -cost.stone);

            if (this.currentItemType === 'wall') {
                const newWall = new Wall(this, this.ghostMesh.position.clone(), this.ghostMesh.rotationQuaternion.clone());
                this.game.addShadowCaster(newWall.mesh);
                this.buildings.push(newWall);
            } else if (this.currentItemType === 'lamppost') {
                const groundPosition = this.ghostMesh.position.clone();
                groundPosition.y = 0; // The lamppost constructor expects a ground-level position
                const newLamppost = new Lamppost(this.scene, groundPosition);
                this.game.world.lampposts.push(newLamppost);
                this.game.cycleManager.addLamppost(newLamppost);
                // Note: Lamppost creates its own meshes, we might want to add them to shadow casters if needed
            }
            
            console.log(`${this.currentItemType} placed.`);
        } else {
            console.log("Not enough resources!");
        }
        
        this.cancelPlacement(); // End placement after one build
    }

    removeBuilding(buildingToRemove) {
        const index = this.buildings.indexOf(buildingToRemove);
        if (index > -1) {
            this.buildings.splice(index, 1);
        }
    }

    // This is now called from BabylonGame's central key listener
    handlePlacementKeyPress(e) {
        if (this.currentItemType === 'wall') {
            if (e.key === 'r' || e.key === 'R') {
                this.placementRotation += Math.PI / 2;
                this.updateGhostMeshPosition(); // Update ghost immediately
                e.preventDefault();
            }
        }
        if (e.key === 'Escape') {
            this.cancelPlacement();
            e.preventDefault();
        }
    }

    createGhostMesh(itemType) {
        if (this.ghostMesh) this.ghostMesh.dispose();

        if (itemType === 'wall') {
            this.ghostMesh = BABYLON.MeshBuilder.CreateBox("ghostWall", { width: 2, height: 1, depth: 0.2 }, this.scene);
        } else if (itemType === 'lamppost') {
            this.ghostMesh = BABYLON.MeshBuilder.CreateCylinder("ghostLamppost", { height: 1.5, diameter: 0.1 }, this.scene);
            this.ghostMesh.position.y = 0.75;
        }
        
        if (this.ghostMesh) {
            const ghostMat = new BABYLON.StandardMaterial("ghostMat", this.scene);
            ghostMat.alpha = 0.5;
            this.ghostMesh.material = ghostMat;
            this.ghostMesh.isPickable = false;
            this.updateGhostMeshPosition(); // Initial position update
        }
    }

    destroyGhostMesh() {
        if (this.ghostMesh) {
            this.ghostMesh.dispose();
            this.ghostMesh = null;
        }
    }

    updateGhostMeshPosition() {
        if (!this.isPlacing || !this.ghostMesh) return;

        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

        if (pickInfo.hit) {
            const pickPoint = pickInfo.pickedPoint;
            
            if (this.currentItemType === 'wall') {
                this.updateWallGhost(pickPoint);
            } else if (this.currentItemType === 'lamppost') {
                this.updateLamppostGhost(pickPoint);
            }
        } else {
            this.canPlace = false;
            if (this.ghostMesh) {
                this.ghostMesh.material.emissiveColor = BABYLON.Color3.Red();
            }
        }
    }

    updateWallGhost(pickPoint) {
        const tileSize = this.game.world.tileSize;
        const halfTile = tileSize / 2;

        const snappedX = Math.round(pickPoint.x / halfTile) * halfTile;
        const snappedZ = Math.round(pickPoint.z / halfTile) * halfTile;
        const snappedPosition = new BABYLON.Vector3(snappedX, 0.5, snappedZ);
        
        this.ghostMesh.position = snappedPosition;
        this.ghostMesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, this.placementRotation, 0);

        // Validity Check for walls (on edges)
        const x_is_edge = (Math.abs(Math.round(snappedX / halfTile)) % 2) !== 0;
        const z_is_edge = (Math.abs(Math.round(snappedZ / halfTile)) % 2) !== 0;

        let tile1_coords = null;
        let tile2_coords = null;

        if (x_is_edge && !z_is_edge) { // Vertical edge
            tile1_coords = this.game.world.getTileCoordinates(new BABYLON.Vector3(snappedX - 0.1, 0, snappedZ));
            tile2_coords = this.game.world.getTileCoordinates(new BABYLON.Vector3(snappedX + 0.1, 0, snappedZ));
        } else if (!x_is_edge && z_is_edge) { // Horizontal edge
            tile1_coords = this.game.world.getTileCoordinates(new BABYLON.Vector3(snappedX, 0, snappedZ - 0.1));
            tile2_coords = this.game.world.getTileCoordinates(new BABYLON.Vector3(snappedX, 0, snappedZ + 0.1));
        }

        if (tile1_coords && tile2_coords) {
            const tile1 = this.game.world.tiles[this.game.world.getTileKey(tile1_coords.x, tile1_coords.z)];
            const tile2 = this.game.world.tiles[this.game.world.getTileKey(tile2_coords.x, tile2_coords.z)];

            if ((tile1 && tile1.metadata.unlocked) || (tile2 && tile2.metadata.unlocked)) {
                this.canPlace = true;
                this.ghostMesh.material.emissiveColor = BABYLON.Color3.Green();
            } else {
                this.canPlace = false;
                this.ghostMesh.material.emissiveColor = BABYLON.Color3.Red();
            }
        } else {
            this.canPlace = false;
            this.ghostMesh.material.emissiveColor = BABYLON.Color3.Red();
        }
    }

    updateLamppostGhost(pickPoint) {
        const { x, z } = this.game.world.getTileCoordinates(pickPoint);
        const key = this.game.world.getTileKey(x, z);
        const tile = this.game.world.tiles[key];

        if (tile && tile.metadata.unlocked) {
            this.ghostMesh.position.x = tile.position.x;
            this.ghostMesh.position.z = tile.position.z;
            this.canPlace = true;
            this.ghostMesh.material.emissiveColor = BABYLON.Color3.Green();
        } else {
            // Follow the mouse but show it's not placeable
            this.ghostMesh.position.x = pickPoint.x;
            this.ghostMesh.position.z = pickPoint.z;
            this.canPlace = false;
            this.ghostMesh.material.emissiveColor = BABYLON.Color3.Red();
        }
    }
}
