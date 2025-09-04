
import * as BABYLON from '@babylonjs/core';

export class ResourceManager {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;
        this.resources = [];
        this.respawnQueue = [];
        this.respawnTime = 10000; // 10 seconds
    }

    createResource(type, position) {
        const modelData = this.game.models[type];
        if (!modelData) {
            console.error(`Model for type "${type}" not found.`);
            return null;
        }

        const newInstance = modelData.mesh.clone(`${type}_${this.resources.length}`);
        newInstance.position = position;
        newInstance.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3);
        newInstance.setEnabled(true);

        this.game.mainShadowGenerator.addShadowCaster(newInstance, true);

        const resource = {
            mesh: newInstance,
            type: type,
        };

        this.resources.push(resource);
        return resource;
    }

    harvestResource(resource) {
        const index = this.resources.indexOf(resource);
        if (index > -1) {
            const harvestedResource = this.resources.splice(index, 1)[0];
            harvestedResource.mesh.setEnabled(false); // Hide instead of dispose
            this.respawnQueue.push({ resource: harvestedResource, respawnAt: Date.now() + this.respawnTime });
            return harvestedResource.type;
        }
        return null;
    }

    update() {
        const now = Date.now();
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const item = this.respawnQueue[i];
            if (now >= item.respawnAt) {
                item.resource.mesh.setEnabled(true);
                this.resources.push(item.resource);
                this.respawnQueue.splice(i, 1);
            }
        }
    }
}
