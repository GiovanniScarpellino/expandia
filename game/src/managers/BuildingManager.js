
import * as BABYLON from '@babylonjs/core';
import { Wall } from '../babylon/Wall.js';

export class BuildingManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.isBuildingMode = false;
        this.ghostWall = null;
        this.canPlace = false;

        this.wallCost = 5; // 5 wood
    }

    enterBuildMode(itemType) {
        if (itemType !== 'wall') return;
        if (this.isBuildingMode) {
            this.exitBuildMode();
            return;
        }

        if (this.game.wood < this.wallCost) {
            console.log("Not enough wood to build a wall.");
            this.game.ui.hideBuildMenu();
            return;
        }

        this.isBuildingMode = true;
        this.createGhostWall();
        this.game.ui.hideBuildMenu(); // Hide menu when entering build mode
        console.log("Entered building mode.");
    }

    exitBuildMode() {
        if (!this.isBuildingMode) return;
        this.isBuildingMode = false;
        this.destroyGhostWall();
        console.log("Exited building mode.");
    }

    createGhostWall() {
        this.ghostWall = BABYLON.MeshBuilder.CreateBox("ghostWall", { width: 2, height: 1, depth: 0.2 }, this.scene);
        const ghostMat = new BABYLON.StandardMaterial("ghostMat", this.scene);
        ghostMat.alpha = 0.4;
        this.ghostWall.material = ghostMat;
        this.ghostWall.isPickable = false;
    }

    destroyGhostWall() {
        if (this.ghostWall) {
            this.ghostWall.dispose();
            this.ghostWall = null;
        }
    }

    update() {
        if (!this.isBuildingMode || !this.ghostWall) return;

        const player = this.game.player;
        const forwardVector = player.mesh.getDirection(BABYLON.Vector3.Forward());
        const targetPosition = player.mesh.position.add(forwardVector.scale(1.5));

        const snappedPosition = new BABYLON.Vector3();
        let snappedRotation = new BABYLON.Quaternion();

        // Determine if orientation is more horizontal or vertical
        if (Math.abs(forwardVector.x) > Math.abs(forwardVector.z)) {
            // Horizontal orientation (wall is vertical)
            snappedPosition.x = Math.round(targetPosition.x);
            snappedPosition.z = Math.round(targetPosition.z / 2) * 2; // Snap to tile center Z
            snappedRotation = BABYLON.Quaternion.FromEulerAngles(0, Math.PI / 2, 0);
        } else {
            // Vertical orientation (wall is horizontal)
            snappedPosition.x = Math.round(targetPosition.x / 2) * 2; // Snap to tile center X
            snappedPosition.z = Math.round(targetPosition.z);
            snappedRotation = BABYLON.Quaternion.FromEulerAngles(0, 0, 0);
        }
        snappedPosition.y = 0.5; // Half of wall height

        this.ghostWall.position = snappedPosition;
        this.ghostWall.rotationQuaternion = snappedRotation;

        // For now, we'll just assume it's always valid
        this.canPlace = true; 
        this.ghostWall.material.emissiveColor = this.canPlace ? BABYLON.Color3.Green() : BABYLON.Color3.Red();
    }

    placeWall() {
        if (!this.isBuildingMode || !this.canPlace) return;

        if (this.game.wood >= this.wallCost) {
            this.game.addResource('tree', -this.wallCost);

            const newWall = new Wall(this.scene, this.ghostWall.position.clone(), this.ghostWall.rotationQuaternion.clone());
            this.game.addShadowCaster(newWall.mesh);
            
            console.log("Wall placed.");
        } else {
            console.log("Not enough wood!");
            this.exitBuildMode();
        }
    }
}
