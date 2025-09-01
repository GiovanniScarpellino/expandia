import { Resource } from '../Resource.js';

export class ResourceManager {
    constructor(scene) {
        this.scene = scene;
        this.resources = [];
        this.respawnQueue = [];
        this.respawnTime = 10000; // 10 seconds
    }

    createResource(type, position) {
        const resource = new Resource(this.scene, type, position);
        this.resources.push(resource);
        return resource;
    }

    update() {
        const now = Date.now();
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const item = this.respawnQueue[i];
            if (now >= item.respawnTime) {
                this.scene.add(item.object.mesh);
                item.object.mesh.userData.targeted = false;
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    harvestResource(resource, harvester) {
        if (resource.mesh.parent) {
            this.scene.remove(resource.mesh);
            this.respawnQueue.push({ object: resource, respawnTime: Date.now() + this.respawnTime });
            return resource.type;
        }
        return null;
    }
}
