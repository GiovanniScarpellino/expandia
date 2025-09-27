import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
    }

    load(url) {
        const fullUrl = import.meta.env.BASE_URL === '/' ? url : `${import.meta.env.BASE_URL}${url}`;
        
        if (this.cache.has(fullUrl)) {
            const cachedGltf = this.cache.get(fullUrl);
            return Promise.resolve({
                ...cachedGltf,
                scene: cachedGltf.scene.clone()
            });
        }

        return new Promise((resolve, reject) => {
            this.loader.load(fullUrl, (gltf) => {
                this.cache.set(fullUrl, gltf);
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
                modelMap[url] = gltfs[index];
            });
            return modelMap;
        });
    }
}
