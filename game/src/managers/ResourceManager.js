import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';

// Simple class to hold resource data
class Resource {
    constructor(mesh, type) {
        this.mesh = mesh;
        this.type = type;
        this.initialPosition = mesh.position.clone();
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