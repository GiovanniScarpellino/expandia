import { Enemy } from '../Enemy.js';

export class EnemyManager {
    constructor(scene, model, questManager) {
        this.scene = scene;
        this.enemies = [];
        this.model = model.scene;
        this.animations = model.animations;
        this.questManager = questManager;
    }

    createEnemy(position) {
        if (this.model && this.animations) {
            const enemy = new Enemy(this.scene, position, this.model.clone(), this.animations);
            this.enemies.push(enemy);
        }
    }

    update(target, delta) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(target, delta);

            if (enemy.isReadyToBeRemoved) {
                this.questManager.checkProgress('defeat_enemy', 1);
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
