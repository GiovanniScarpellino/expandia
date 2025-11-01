import * as BABYLON from '@babylonjs/core';

export class InteractionManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.player = game.player;
        this.highlightLayer = game.highlightLayer;

        this.currentTarget = null;

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (this.game.gameState !== 'RUNNING') return;

            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
                this.handleInteraction();
            }
        });
    }

    handleInteraction() {
        // If there's a highlighted target, interact with it.
        if (this.currentTarget) {
            this.currentTarget.onInteract();
        } 
        // In combat mode, if there is no interactable target, the player attacks in the direction of the.mouse.
        else if (this.game.gameMode === 'COMBAT') {
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

    setTarget(interactable) {
        if (this.currentTarget === interactable) return;

        this.clearTarget();
        this.currentTarget = interactable;

        // Add the visual mesh and its children to the highlight layer
        this.highlightLayer.addMesh(this.currentTarget.visualMesh, BABYLON.Color3.Green());
        this.currentTarget.visualMesh.getChildMeshes().forEach(m => {
            this.highlightLayer.addMesh(m, BABYLON.Color3.Green());
        });
    }

    clearTarget() {
        if (!this.currentTarget) return;

        // Remove the visual mesh and its children from the highlight layer
        this.highlightLayer.removeMesh(this.currentTarget.visualMesh);
        this.currentTarget.visualMesh.getChildMeshes().forEach(m => {
            this.highlightLayer.removeMesh(m);
        });

        this.currentTarget = null;
    }

    update() {
        // Update mouse position for aiming projectiles (especially in combat)
        const groundPick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "mouseGround" || mesh.name.startsWith("arenaGround"));
        if (groundPick.hit) {
            this.game.mousePositionInWorld = groundPick.pickedPoint;
        }

        // Raycast from player to find interactable target
        const rayOrigin = this.player.hitbox.position.add(this.player.hitbox.forward.scale(0.5)); // Start ray slightly in front
        const ray = new BABYLON.Ray(rayOrigin, this.player.hitbox.forward, 3);

        const hit = this.scene.pickWithRay(ray, (mesh) => mesh.isPickable && mesh.isEnabled());

        let potentialTarget = null;
        if (hit.hit) {
            potentialTarget = this.getInteractable(hit.pickedMesh);
        }

        if (potentialTarget) {
            this.setTarget(potentialTarget);
        }

        else {
            this.clearTarget();
        }
    }
}
