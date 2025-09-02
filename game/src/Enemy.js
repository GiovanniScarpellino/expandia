import * as THREE from 'three';

export class Enemy {
    constructor(scene, position, model, animations) {
        this.scene = scene;
        this.mesh = model;
        this.mesh.position.copy(position);
        this.mesh.scale.set(0.1, 0.1, 0.1);

        this.originalColor = new THREE.Color(0xff0000);
        this.brokenColor = new THREE.Color(0xcccccc); // Grey when broken

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.material = child.material.clone();
                child.material.color.copy(this.originalColor);
            }
        });
        
        this.scene.add(this.mesh);

        // --- ANIMATION ---
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.actions = {};
        this.activeAction = null;

        const walkClip = THREE.AnimationClip.findByName(animations, 'walk');
        const idleClip = THREE.AnimationClip.findByName(animations, 'idle');
        const dieClip = THREE.AnimationClip.findByName(animations, 'die');
        const attackClip = THREE.AnimationClip.findByName(animations, 'attack-melee-right');

        if (idleClip) this.actions['idle'] = this.mixer.clipAction(idleClip);
        if (walkClip) this.actions['walk'] = this.mixer.clipAction(walkClip);
        if (dieClip) this.actions['die'] = this.mixer.clipAction(dieClip);
        if (attackClip) this.actions['attack'] = this.mixer.clipAction(attackClip);
        
        this.setActiveAction(this.actions['idle']);

        // --- STATS ---
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.maxPosture = 100;
        this.posture = this.maxPosture;
        this.attackDamage = 5;
        
        // --- STATE ---
        this.isBroken = false;
        this.isDying = false;
        this.isReadyToBeRemoved = false;

        // --- BEHAVIOR ---
        this.speed = 0.01; // Reduced speed for more realistic animation sync
        this.aggroRange = 5;
        this.attackRange = 1;
        this.attackCooldown = 1500; // 1.5 seconds
        this.lastAttackTime = 0;
    }

    setActiveAction(actionName, loopOnce = false) {
        const action = this.actions[actionName];
        if (this.activeAction === action || !action) return;

        if (this.activeAction) {
            this.activeAction.fadeOut(0.2);
        }
        
        this.activeAction = action;
        this.activeAction.reset();

        if (loopOnce) {
            this.activeAction.setLoop(THREE.LoopOnce, 1);
            this.activeAction.clampWhenFinished = true;
        }

        this.activeAction.fadeIn(0.2).play();
    }

    update(player, delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }

        const dieAction = this.actions['die'];
        if (this.isDying) {
            if (dieAction && !dieAction.isRunning()) {
                this.isReadyToBeRemoved = true;
            }
            return;
        }

        const attackAction = this.actions['attack'];
        if (this.activeAction === attackAction && !attackAction.isRunning()) {
            this.setActiveAction('idle');
        }

        if (this.isBroken || (this.activeAction === attackAction && attackAction.isRunning())) {
            if(this.isBroken) this.setActiveAction('idle');
            return; // Don't move or do anything else while broken or attacking
        }

        const distanceToPlayer = this.mesh.position.distanceTo(player.mesh.position);

        if (distanceToPlayer < this.aggroRange) {
            const direction = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position);
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;

            if (distanceToPlayer > this.attackRange) {
                direction.normalize();
                this.mesh.position.add(direction.multiplyScalar(this.speed));
                this.setActiveAction('walk');
            } else {
                const now = Date.now();
                if (now - this.lastAttackTime > this.attackCooldown) {
                    this.setActiveAction('attack', true);
                    player.takeDamage(this.attackDamage);
                    this.lastAttackTime = now;
                } else {
                    if (this.activeAction !== this.actions['attack']) {
                        this.setActiveAction('idle');
                    }
                }
            }
        } else {
            this.setActiveAction('idle');
        }
    }

    takePostureDamage(amount) {
        if (this.isBroken || this.isDying) return;

        this.posture -= amount;
        if (this.posture <= 0) {
            this.posture = 0;
            this.isBroken = true;
            this.mesh.traverse(child => {
                if (child.isMesh) child.material.color.copy(this.brokenColor);
            });

            setTimeout(() => {
                this.isBroken = false;
                this.posture = this.maxPosture;
                this.mesh.traverse(child => {
                    if (child.isMesh) child.material.color.copy(this.originalColor);
                });
            }, 3000);
        }
    }

    takeDamage(amount) {
        if (this.isDying) return;

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDying = true;
            const dieAction = this.actions['die'];
            dieAction.setLoop(THREE.LoopOnce, 1);
            dieAction.clampWhenFinished = true;
            this.setActiveAction(dieAction);
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
