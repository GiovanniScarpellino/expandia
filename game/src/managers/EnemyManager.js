import { Enemy } from '../Enemy.js';

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
    }

    createEnemy(position) {
        const enemy = new Enemy(this.scene, position);
        this.enemies.push(enemy);
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
