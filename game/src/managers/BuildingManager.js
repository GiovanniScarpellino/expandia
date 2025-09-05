import * as BABYLON from '@babylonjs/core';
import { Wall } from '../babylon/Wall.js';

export class BuildingManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.isBuildingMode = false;
        this.ghostMesh = null;
        this.canPlace = false;
        this.placementRotation = 0;

        this.wallCost = 5;

        this.inputObserver = null;
    }

    enterBuildMode(itemType) {
        if (itemType !== 'wall') return;

        if (this.game.wood < this.wallCost) {
            console.log("Not enough wood.");
            this.game.ui.toggleBuildMenu(false);
            return;
        }

        this.isBuildingMode = true;
        this.game.setPaused(true);
        this.createGhostMesh();
        this.game.ui.toggleBuildMenu(false);
        console.log("Entered building mode. Use mouse to place, R to rotate, Esc to exit.");

        // Listen for clicks and key presses
        this.inputObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this.placeItem();
            }
        });

        window.addEventListener('keydown', this.handleKeyPress);
    }

    exitBuildMode() {
        if (!this.isBuildingMode) return;
        this.isBuildingMode = false;
        this.game.setPaused(false);
        this.destroyGhostMesh();
        console.log("Exited building mode.");

        this.scene.onPointerObservable.remove(this.inputObserver);
        window.removeEventListener('keydown', this.handleKeyPress);
    }

    handleKeyPress = (e) => {
        if (!this.isBuildingMode) return;
        if (e.key === 'Escape') {
            this.exitBuildMode();
        }
        if (e.key === 'r' || e.key === 'R') {
            this.placementRotation += Math.PI / 2;
        }
    }

    createGhostMesh() {
        this.ghostMesh = BABYLON.MeshBuilder.CreateBox("ghostWall", { width: 2, height: 1, depth: 0.2 }, this.scene);
        const ghostMat = new BABYLON.StandardMaterial("ghostMat", this.scene);
        ghostMat.alpha = 0.5;
        this.ghostMesh.material = ghostMat;
        this.ghostMesh.isPickable = false;
    }

    destroyGhostMesh() {
        if (this.ghostMesh) {
            this.ghostMesh.dispose();
            this.ghostMesh = null;
        }
    }

    update() {
        if (!this.isBuildingMode || !this.ghostMesh) return;

        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name.startsWith("tile-"));
        
        if (pickInfo.hit && pickInfo.pickedMesh.metadata.unlocked) {
            const tile = pickInfo.pickedMesh;
            const pickPoint = pickInfo.pickedPoint;

            // Determine position and rotation based on cursor position relative to tile center
            const relativePos = pickPoint.subtract(tile.position);
            
            let snappedPosition = new BABYLON.Vector3();
            let snappedRotation = BABYLON.Quaternion.FromEulerAngles(0, this.placementRotation, 0);

            const threshold = 0.5; // 50% of the half-width of the tile

            if (Math.abs(relativePos.x) > Math.abs(relativePos.z)) {
                // Closer to a vertical edge (left/right)
                snappedPosition.x = tile.position.x + Math.sign(relativePos.x);
                snappedPosition.z = Math.round(pickPoint.z);
            } else {
                // Closer to a horizontal edge (top/bottom)
                snappedPosition.x = Math.round(pickPoint.x);
                snappedPosition.z = tile.position.z + Math.sign(relativePos.z);
            }

            snappedPosition.y = 0.5; // Half of wall height

            this.ghostMesh.position = snappedPosition;
            this.ghostMesh.rotationQuaternion = snappedRotation;

            this.canPlace = true;
            this.ghostMesh.material.emissiveColor = BABYLON.Color3.Green();
        } else {
            this.canPlace = false;
            if (this.ghostMesh) {
                this.ghostMesh.material.emissiveColor = BABYLON.Color3.Red();
            }
        }
    }

    placeItem() {
        if (!this.isBuildingMode || !this.canPlace) return;

        if (this.game.wood >= this.wallCost) {
            this.game.addResource('tree', -this.wallCost);

            const newWall = new Wall(this.scene, this.ghostMesh.position.clone(), this.ghostMesh.rotationQuaternion.clone());
            this.game.addShadowCaster(newWall.mesh);
            
            console.log("Wall placed.");
            // Exit build mode after placing, or let user place more? For now, exit.
            // this.exitBuildMode(); 
        } else {
            console.log("Not enough wood!");
            this.exitBuildMode();
        }
    }
}