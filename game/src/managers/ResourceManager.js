import { Resource } from '../Resource.js';
import * as THREE from 'three';

export class ResourceManager {
    constructor(scene, models) {
        this.scene = scene;
        this.resources = [];
        this.respawnQueue = [];
        this.respawnTime = 10000; // 10 seconds
        this.models = models;
    }

    createResource(type, position) {
        let model;
        if (type === 'tree' && this.models.tree.length > 0) {
            model = this.models.tree[Math.floor(Math.random() * this.models.tree.length)];
        } else if (type === 'rock' && this.models.rock.length > 0) {
            model = this.models.rock[Math.floor(Math.random() * this.models.rock.length)];
        }

        if (model) {
            const resource = new Resource(this.scene, type, position, model.scene.clone());
            this.resources.push(resource);
            return resource;
        }
        return null;
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

    clearAll() {
        this.resources.forEach(resource => {
            if (resource.mesh.parent) {
                this.scene.remove(resource.mesh);
            }
        });
        this.resources = [];
        this.respawnQueue = [];
    }

    loadState(data) {
        this.clearAll();
        if (!data) return;

        data.active.forEach(resData => {
            this.createResource(resData.type, new THREE.Vector3(resData.position.x, resData.position.y, resData.position.z));
        });

        data.respawning.forEach(resData => {
            const resource = this.createResource(resData.type, new THREE.Vector3(resData.position.x, resData.position.y, resData.position.z));
            if (resource) {
                this.scene.remove(resource.mesh);
                this.respawnQueue.push({ object: resource, respawnTime: resData.respawnAt });
            }
        });
    }
}
