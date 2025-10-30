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

    initialize(resourceData) {
        resourceData.forEach(data => {
            let model;
            if (data.type === 'tree') {
                model = this.game.models.tree;
            } else if (data.type === 'rock') {
                model = this.game.models.rock;
            }

            if (model) {
                const newMesh = model.mesh.clone(`${data.type}-${this.resources.length}`);
                newMesh.position = new BABYLON.Vector3(data.x, 0, data.z);
                newMesh.setEnabled(true);

                newMesh.getChildMeshes().forEach(m => {
                    m.checkCollisions = true;
                    m.collisionGroup = COLLISION_GROUPS.WALL;
                });

                // Add metadata for targeting
                newMesh.metadata = {
                    type: 'resource',
                    resourceType: data.type,
                    isTargeted: false
                };

                this.game.addShadowCaster(newMesh);
                const resource = new Resource(newMesh, data.type);
                this.resources.push(resource);
            }
        });
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