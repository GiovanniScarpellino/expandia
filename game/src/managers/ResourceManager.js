import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';

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

    spawnResource(position, type = null) {
        // Prevent spawning if the player is too close
        if (this.game.player && BABYLON.Vector3.Distance(this.game.player.hitbox.position, position) < 1.0) {
            console.log("Player is too close, resource will not spawn.");
            return;
        }

        const random = Math.random();
        if (random < 0.25) {
            // 25% chance to spawn a grave
            const graveMesh = BABYLON.MeshBuilder.CreateBox("grave", {width: 1, height: 2, depth: 0.5}, this.scene);
            graveMesh.position = position.clone();
            graveMesh.position.y = 1;
            const graveMaterial = new BABYLON.StandardMaterial("graveMat", this.scene);
            graveMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.8); // A purplish color
            graveMesh.material = graveMaterial;
            graveMesh.metadata = { type: 'grave' };
            this.game.graves.push(graveMesh);
            this.game.addShadowCaster(graveMesh);
            return;
        }

        if (!type) {
            type = Math.random() < 0.7 ? 'tree' : 'rock'; // 70% chance for a tree
        }

        let model;
        if (type === 'tree') {
            model = this.game.models.tree;
        } else if (type === 'rock') {
            model = this.game.models.rock;
        }

        if (model) {
            if (type === 'rock') {
                const rockMesh = model.mesh.clone(`rock-visual-${this.resources.length}`);
                rockMesh.setEnabled(true);
                rockMesh.getChildMeshes().forEach(m => m.checkCollisions = false);

                const collisionBox = BABYLON.MeshBuilder.CreateBox(`rock-collision-${this.resources.length}`, { width: 0.8, height: 0.8, depth: 0.8 }, this.scene);
                collisionBox.position = position.clone();
                collisionBox.position.y = 0.4;
                collisionBox.isVisible = false;
                collisionBox.checkCollisions = true;
                collisionBox.collisionGroup = COLLISION_GROUPS.WALL;

                rockMesh.parent = collisionBox;
                rockMesh.position.y = -0.4;

                collisionBox.metadata = {
                    type: 'resource',
                    resourceType: type,
                    isTargeted: false
                };

                this.game.addShadowCaster(rockMesh);
                const resource = new Resource(collisionBox, type, rockMesh);
                this.resources.push(resource);
            } else { // For trees and other resources
                const newMesh = model.mesh.clone(`${type}-${this.resources.length}`);
                newMesh.position = position.clone();
                newMesh.setEnabled(true);

                newMesh.getChildMeshes().forEach(m => {
                    m.checkCollisions = true;
                    m.collisionGroup = COLLISION_GROUPS.WALL;
                });

                newMesh.metadata = {
                    type: 'resource',
                    resourceType: type,
                    isTargeted: false
                };

                this.game.addShadowCaster(newMesh);
                const resource = new Resource(newMesh, type);
                this.resources.push(resource);
            }
        }
    }

    update(delta) {
        const now = Date.now();
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const item = this.respawnQueue[i];
            if (now >= item.respawnTime) {
                const resource = item.resource;
                resource.mesh.position = resource.initialPosition;
                resource.mesh.setEnabled(true);
                resource.mesh.getChildMeshes().forEach(m => m.checkCollisions = true);
                resource.mesh.metadata.isTargeted = false;
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    harvestResource(resourceMesh) {
        const resource = this.resources.find(r => r.mesh === resourceMesh);
        if (resource && resource.mesh.isEnabled()) {
            resource.mesh.setEnabled(false);
            resource.mesh.getChildMeshes().forEach(m => m.checkCollisions = false);
            this.respawnQueue.push({ resource: resource, respawnTime: Date.now() + this.respawnTime });
            return resource.type;
        }
        return null;
    }
}