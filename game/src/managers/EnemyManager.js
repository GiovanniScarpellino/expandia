import { Enemy } from '../Enemy.js';

export class EnemyManager {
    constructor(scene, modelLoader) {
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.enemies = [];
        this.model = null;
    }

    load() {
        return this.modelLoader.load('/src/models/character-a.glb').then(model => {
            this.model = model;
        });
    }

    createEnemy(position) {
        if (this.model) {
            const enemy = new Enemy(this.scene, position, this.model.clone());
            this.enemies.push(enemy);
        }
    }

    update(player) {
        this.enemies.forEach(enemy => enemy.update(player));
    }
    
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            enemy.destroy();
        }
    }
}
