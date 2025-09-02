import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
    }

    load(url) {
        if (this.cache.has(url)) {
            return Promise.resolve(this.cache.get(url).clone());
        }

        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                const scene = gltf.scene || gltf.scenes[0];
                this.cache.set(url, scene);
                resolve(scene.clone());
            }, undefined, reject);
        });
    }

    loadAll(urls) {
        const promises = urls.map(url => this.load(url));
        return Promise.all(promises).then(models => {
            const modelMap = {};
            urls.forEach((url, index) => {
                modelMap[url] = models[index];
            });
            return modelMap;
        });
    }
}
