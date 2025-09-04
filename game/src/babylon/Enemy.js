
import * as BABYLON from '@babylonjs/core';

export class Enemy {
    constructor(game, scene, mesh, animationGroups) {
        this.game = game;
        this.scene = scene;
        this.mesh = mesh;
        this.mesh.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
        this.mesh.setEnabled(true);

        // --- ANIMATION ---
        this.animations = {};
        this.activeAnimation = null;
        animationGroups.forEach(group => {
            this.animations[group.name] = group;
        });
        this.playAnimation('idle');

        // --- STATS ---
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.attackDamage = 10;
        
        // --- STATE ---
        this.isDying = false;
        this.isReadyToBeRemoved = false;

        // --- BEHAVIOR ---
        this.speed = 0.015;
        this.aggroRange = 20;
        this.attackRange = 1.5;
        this.attackCooldown = 1500; // ms
        this.lastAttackTime = 0;
    }

    playAnimation(name, loop = true, speed = 1.0) {
        if (this.activeAnimation && this.activeAnimation.name === name) return;

        const animation = this.animations[name];
        if (animation) {
            if (this.activeAnimation) {
                this.activeAnimation.stop();
            }
            animation.start(loop, speed, animation.from, animation.to, false);
            this.activeAnimation = animation;
        }
    }

    update(target, delta) {
        if (this.isDying) {
            // If die animation exists and has finished, mark for removal
            const dieAnim = this.animations['die'];
            if (dieAnim && !dieAnim.isPlaying) {
                this.isReadyToBeRemoved = true;
            }
            return;
        }

        const attackAnim = this.animations['attack-melee-right'];
        if (attackAnim && attackAnim.isPlaying) {
            return; // Don't do other logic while attacking
        }

        const distanceToTarget = BABYLON.Vector3.Distance(this.mesh.position, target.position);

        if (distanceToTarget < this.aggroRange) {
            const direction = target.position.subtract(this.mesh.position);
            
            if (distanceToTarget > this.attackRange) {
                // Move towards target
                direction.normalize();
                this.mesh.position.addInPlace(direction.scale(this.speed));
                this.mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z), 0);
                this.playAnimation('walk');
            } else {
                // Attack target
                this.playAnimation('idle');
                const now = Date.now();
                if (now - this.lastAttackTime > this.attackCooldown) {
                    this.lastAttackTime = now;
                    this.playAnimation('attack-melee-right', false);
                    if (target.metadata && target.metadata.takeDamage) {
                        target.metadata.takeDamage(this.attackDamage);
                    }
                }
            }
        } else {
            this.playAnimation('idle');
        }
    }

    takeDamage(amount) {
        if (this.isDying) return;

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDying = true;
            this.playAnimation('die', false);
            // The check for removal is in the update loop
        }
    }

    dispose() {
        this.mesh.dispose();
    }
}
