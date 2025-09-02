import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
    }

    load(url) {
        if (this.cache.has(url)) {
            const cachedGltf = this.cache.get(url);
            // Return a new object with a cloned scene to avoid shared state issues
            return Promise.resolve({
                ...cachedGltf,
                scene: cachedGltf.scene.clone()
            });
        }

        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                // Cache the original gltf object
                this.cache.set(url, gltf);
                // Return a new object with a cloned scene
                resolve({
                    ...gltf,
                    scene: gltf.scene.clone()
                });
            }, undefined, reject);
        });
    }

    loadAll(urls) {
        const promises = urls.map(url => this.load(url));
        return Promise.all(promises).then(gltfs => {
            const modelMap = {};
            urls.forEach((url, index) => {
                // The promise now resolves with the full gltf object
                modelMap[url] = gltfs[index];
            });
            return modelMap;
        });
    }
}
