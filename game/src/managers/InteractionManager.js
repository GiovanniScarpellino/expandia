import * as BABYLON from '@babylonjs/core';

export class InteractionManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.player = game.player;
        this.highlightLayer = game.highlightLayer;

        this.currentTarget = null;
        this.potentialTarget = null; // New: store hovered interactable

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (this.game.gameState !== 'RUNNING') return;

            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.handlePointerMove(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo);
                    break;
            }
        });
    }

    handlePointerMove(pointerInfo) {
        const scene = this.scene;

        // Pick 1: For world position (aiming)
        const groundPick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.name === "mouseGround" || mesh.name === "arenaGround");
        if (groundPick.hit) {
            this.game.mousePositionInWorld = groundPick.pickedPoint;
        }

        // Pick 2: For interactable objects
        const interactablePick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.isPickable && mesh.isEnabled());

        if (interactablePick.hit) {
            this.potentialTarget = this.getInteractable(interactablePick.pickedMesh);
        } else {
            this.potentialTarget = null;
        }
    }

    handlePointerDown(pointerInfo) {
        if (pointerInfo.event.button !== 0) return; // Only left click

        if (this.currentTarget && this.isPlayerClose(this.currentTarget)) {
            this.currentTarget.onInteract();
        } else {
            this.player.attack();
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
        return BABYLON.Vector3.Distance(this.player.hitbox.position, interactable.mesh.getAbsolutePosition()) < interactable.interactionDistance;
    }

    setTarget(interactable) {
        if (this.currentTarget === interactable) return;

        this.clearTarget();
        this.currentTarget = interactable;
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
        this.currentTarget = null;
    }

    update() {
        if (this.potentialTarget && this.isPlayerClose(this.potentialTarget)) {
            this.setTarget(this.potentialTarget);
        } else {
            this.clearTarget();
        }
    }
}
