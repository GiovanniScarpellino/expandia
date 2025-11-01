import * as BABYLON from '@babylonjs/core';

export class InteractionManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.player = game.player;
        this.highlightLayer = game.highlightLayer;

        this.currentTarget = null;
        this.potentialTarget = null;

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (this.game.gameState !== 'RUNNING') return;

            switch (pointerInfo.type) {
                // POINTERMOVE is now handled in the update loop
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo);
                    break;
            }
        });
    }

    handlePointerDown(pointerInfo) {
        if (pointerInfo.event.button !== 0) return; // Only left click

        if (this.currentTarget && this.isPlayerClose(this.currentTarget)) {
            this.currentTarget.onInteract();
        } else {
            // Only allow attacking in COMBAT mode
            if (this.game.gameMode === 'COMBAT') {
                this.player.attack();
            }
        }
    }

    getInteractable(mesh) {
        if (!mesh) return null;
        if (mesh.interactable) {
            return mesh.interactable;
        }
        if (mesh.parent) {
            return this.getInteractable(mesh.parent);
        }
        return null;
    }

    isPlayerClose(interactable) {
        // If the interactable is a tile, calculate distance to the closest point on its surface.
        if (interactable.mesh.metadata && interactable.mesh.metadata.type === 'tile') {
            const playerPos = this.player.hitbox.getAbsolutePosition();
            const tilePos = interactable.mesh.getAbsolutePosition();
            const tileSize = this.game.world.tileSize;
            const halfSize = tileSize / 2;

            // Find the closest point on the tile's XZ bounding box to the player
            const closestX = Math.max(tilePos.x - halfSize, Math.min(playerPos.x, tilePos.x + halfSize));
            const closestZ = Math.max(tilePos.z - halfSize, Math.min(playerPos.z, tilePos.z + halfSize));

            const closestPoint = new BABYLON.Vector3(closestX, playerPos.y, closestZ);

            // Calculate the distance from the player to this closest point
            const distance = BABYLON.Vector3.Distance(playerPos, closestPoint);
            return distance < interactable.interactionDistance;

        } else {
            // Original logic for other interactables (like resources, base, etc.)
            return BABYLON.Vector3.Distance(
                this.player.hitbox.getAbsolutePosition(), 
                interactable.mesh.getAbsolutePosition()
            ) < interactable.interactionDistance;
        }
    }

    setTarget(interactable) {
        if (this.currentTarget === interactable) return;

        this.clearTarget();
        this.currentTarget = interactable;

        if (this.currentTarget.visualMesh.metadata && this.currentTarget.visualMesh.metadata.isHighlightMesh) {
            this.currentTarget.visualMesh.isVisible = true;
        }

        this.highlightLayer.addMesh(this.currentTarget.visualMesh, BABYLON.Color3.Green());
        this.currentTarget.visualMesh.getChildMeshes().forEach(m => {
            this.highlightLayer.addMesh(m, BABYLON.Color3.Green());
        });
    }

    clearTarget() {
        if (!this.currentTarget) return;

        this.highlightLayer.removeMesh(this.currentTarget.visualMesh);
        this.currentTarget.visualMesh.getChildMeshes().forEach(m => {
            this.highlightLayer.removeMesh(m);
        });

        if (this.currentTarget.visualMesh.metadata && this.currentTarget.visualMesh.metadata.isHighlightMesh) {
            this.currentTarget.visualMesh.isVisible = false;
        }

        this.currentTarget = null;
    }

    update() {
        // Pick 1: Continuously update mouse position in the world for aiming
        const groundPick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "mouseGround" || mesh.name === "arenaGround");
        if (groundPick.hit) {
            this.game.mousePositionInWorld = groundPick.pickedPoint;
        }

        // Pick 2: Continuously update potential target for interaction
        const interactablePick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.isPickable && mesh.isEnabled());
        if (interactablePick.hit) {
            this.potentialTarget = this.getInteractable(interactablePick.pickedMesh);
        } else {
            this.potentialTarget = null;
        }

        // Handle highlighting based on proximity and potential target
        if (this.potentialTarget && this.isPlayerClose(this.potentialTarget)) {
            this.setTarget(this.potentialTarget);
        } else {
            this.clearTarget();
        }
    }
}
