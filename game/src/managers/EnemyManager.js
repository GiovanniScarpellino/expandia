import { Enemy } from '../Enemy.js';

export class EnemyManager {
    constructor(scene, modelLoader) {
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.enemies = [];
        this.model = null;
        this.animations = null;
    }

    load() {
        return this.modelLoader.load('/src/models/character-a.glb').then(gltf => {
            this.model = gltf.scene;
            this.animations = gltf.animations;
        });
    }

    createEnemy(position) {
        if (this.model && this.animations) {
            const enemy = new Enemy(this.scene, position, this.model.clone(), this.animations);
            this.enemies.push(enemy);
        }
    }

    update(player, delta) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(player, delta);

            if (enemy.isReadyToBeRemoved) {
                enemy.destroy();
                this.enemies.splice(i, 1);
            }
        }
    }
    
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            enemy.destroy();
        }
    }
}
