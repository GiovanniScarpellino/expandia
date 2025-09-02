import { Resource } from '../Resource.js';
import { ModelLoader } from '../utils/ModelLoader.js';

export class ResourceManager {
    constructor(scene, modelLoader) {
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.resources = [];
        this.respawnQueue = [];
        this.respawnTime = 10000; // 10 seconds
        this.models = {};

        this.treeModelUrls = [
            '/src/models/tree.glb',
            '/src/models/tree-crooked.glb',
        ];
        this.rockModelUrls = [
            '/src/models/rock-small.glb',
            '/src/models/rock-large.glb',
            '/src/models/rock-wide.glb'
        ];
    }

    load() {
        const allModelUrls = [...this.treeModelUrls, ...this.rockModelUrls];
        return this.modelLoader.loadAll(allModelUrls).then(models => {
            this.models.tree = this.treeModelUrls.map(url => models[url]);
            this.models.rock = this.rockModelUrls.map(url => models[url]);
        });
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
}
