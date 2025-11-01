import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';
import { Interactable } from '../babylon/Interactable.js';

// Simple class to hold resource data
class Resource {
    constructor(mesh, type, visualMesh = null) {
        this.mesh = mesh;
        this.type = type;
        this.initialPosition = mesh.position.clone();
        this.visualMesh = visualMesh || mesh;
    }
}

export class ResourceManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.resources = [];
        this.respawnQueue = [];
        this.respawnTime = 10000; // 10 seconds
    }

    initialize() {
        // Resources are now spawned procedurally by World.js
    }

    spawnResource(position, explicitType = null) {
        // Prevent spawning if the player is too close
        if (this.game.player && BABYLON.Vector3.Distance(this.game.player.hitbox.position, position) < 1.0) {
            console.log("Player is too close, resource will not spawn.");
            return;
        }

        let typeToSpawn = explicitType;

        if (!explicitType) {
            const random = Math.random();
            const graveChance = 0.15; // 15% chance for a grave
            const rockChance = 0.30;  // 30% chance for a rock

            // 1. Grave check (only after 10 tiles unlocked)
            if (this.game.tilesUnlockedCount > 10 && random < graveChance) {
                typeToSpawn = 'grave';
            } else if (random < graveChance + rockChance) { // 2. Rock check
                typeToSpawn = 'rock';
            } else { // 3. Default to Tree
                typeToSpawn = 'tree';
            }
        }

        if (typeToSpawn === 'grave') {
            const graveMesh = BABYLON.MeshBuilder.CreateBox("grave", {width: 1, height: 2, depth: 0.5}, this.scene);
            graveMesh.position = position.clone();
            graveMesh.position.y = 1;
            const graveMaterial = new BABYLON.StandardMaterial("graveMat", this.scene);
            graveMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.8); // A purplish color
            graveMesh.material = graveMaterial;
            graveMesh.checkCollisions = true;
            graveMesh.isPickable = true;

            new Interactable(graveMesh, 2, () => {
                this.game.startCombat(graveMesh);
            });

            this.game.graves.push(graveMesh);
            this.game.addShadowCaster(graveMesh);
            return;
        }

        let model;
        if (typeToSpawn === 'tree') {
            model = this.game.models.tree;
        } else if (typeToSpawn === 'rock') {
            model = this.game.models.rock;
        }

        if (model) {
            let resource;
            let interactableMesh;
            let visualMesh;

            if (typeToSpawn === 'rock') {
                const rockMesh = model.mesh.clone(`rock-visual-${this.resources.length}`);
                rockMesh.setEnabled(true);
                rockMesh.getChildMeshes().forEach(m => m.checkCollisions = false);

                const collisionBox = BABYLON.MeshBuilder.CreateBox(`rock-collision-${this.resources.length}`, { width: 0.8, height: 0.8, depth: 0.8 }, this.scene);
                collisionBox.position = position.clone();
                collisionBox.position.y = 0.4;
                collisionBox.isVisible = false;
                collisionBox.checkCollisions = true;
                collisionBox.collisionGroup = COLLISION_GROUPS.WALL;
                collisionBox.isPickable = true;

                rockMesh.parent = collisionBox;
                rockMesh.position.y = -0.4;

                this.game.addShadowCaster(rockMesh);
                resource = new Resource(collisionBox, typeToSpawn, rockMesh);
                interactableMesh = collisionBox;
                visualMesh = rockMesh;
            } else { // For trees and other resources
                const newMesh = model.mesh.clone(`${typeToSpawn}-${this.resources.length}`);
                newMesh.position = position.clone();
                newMesh.setEnabled(true);
                newMesh.isPickable = true;

                newMesh.getChildMeshes().forEach(m => {
                    m.checkCollisions = true;
                    m.collisionGroup = COLLISION_GROUPS.WALL;
                });

                this.game.addShadowCaster(newMesh);
                resource = new Resource(newMesh, typeToSpawn);
                interactableMesh = newMesh;
                visualMesh = newMesh;
            }

            this.resources.push(resource);

            new Interactable(interactableMesh, 2, () => {
                this.game.player.startHarvesting(resource);
            }, visualMesh);
        }
    }

    update(delta) {
        const now = Date.now();
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const item = this.respawnQueue[i];
            if (now >= item.respawnTime) {
                const resource = item.resource;
                resource.mesh.setEnabled(true);
                if (resource.type === 'rock') {
                    resource.mesh.checkCollisions = true;
                }
                else {
                    resource.mesh.getChildMeshes().forEach(m => m.checkCollisions = true);
                }
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    harvestResource(resource) {
        if (resource && resource.mesh.isEnabled()) {
            resource.mesh.setEnabled(false);
            if (resource.type === 'rock') {
                resource.mesh.checkCollisions = false;
            }
            else {
                resource.mesh.getChildMeshes().forEach(m => m.checkCollisions = false);
            }
            this.respawnQueue.push({ resource: resource, respawnTime: Date.now() + this.respawnTime });
            this.game.addResource(resource.type, 1);
        }
    }
}