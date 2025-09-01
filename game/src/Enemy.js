import * as THREE from 'three';

export class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        const enemyGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // red
        this.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.userData = { hp: 100, lastAttackTime: 0 };
        this.scene.add(this.mesh);

        this.speed = 0.06;
        this.attackDamage = 5;
        this.aggroRange = 5;
        this.attackRange = 1;
        this.attackCooldown = 1000; // 1 second
    }

    update(player) {
        const now = Date.now();
        const distanceToPlayer = this.mesh.position.distanceTo(player.mesh.position);

        if (distanceToPlayer < this.aggroRange) {
            const direction = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(this.speed));

            if (distanceToPlayer < this.attackRange && now - this.mesh.userData.lastAttackTime > this.attackCooldown) {
                player.takeDamage(this.attackDamage);
                this.mesh.userData.lastAttackTime = now;
            }
        }
    }

    takeDamage(amount) {
        this.mesh.userData.hp -= amount;
        return this.mesh.userData.hp <= 0;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
