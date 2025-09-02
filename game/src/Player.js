import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, canMoveTo) {
        this.scene = scene;
        this.canMoveTo = canMoveTo;
        this.health = 100;
        this.postureAttackDamage = 35; // New: damage to posture
        this.ruptureAttackDamage = 100; // New: damage to health when enemy is broken
        
        this.walkSpeed = 0.02;
        this.sprintSpeed = 0.05;
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.acceleration = 0.005;
        this.deceleration = 0.01;
        
        this.mixer = null;
        this.actions = {};
        this.activeAction = null;

        // Placeholder cube
        const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.mesh.position.set(0, 0, 0);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
        };

        new GLTFLoader().load('/src/models/character-a.glb', (gltf) => {
            this.scene.remove(this.mesh);
            this.mesh = gltf.scene;
            
            this.mesh.scale.set(0.1, 0.1, 0.1);
            this.mesh.position.set(0, -0.5, 0);

            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.scene.add(this.mesh);

            this.mixer = new THREE.AnimationMixer(this.mesh);

            // Log animations for debugging
            console.log('Available animations:', gltf.animations.map(a => a.name));

            const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle');
            const runClip = THREE.AnimationClip.findByName(gltf.animations, 'walk');
            const attackClip = THREE.AnimationClip.findByName(gltf.animations, 'attack-melee-right');

            if (idleClip) {
                this.actions['idle'] = this.mixer.clipAction(idleClip);
                this.activeAction = this.actions['idle'];
                this.activeAction.play();
            } else {
                console.warn("Animation 'idle' not found.");
            }

            if (runClip) {
                this.actions['run'] = this.mixer.clipAction(runClip);
            }
            if(attackClip){
                this.actions['attack'] = this.mixer.clipAction(attackClip);
            }

        }, undefined, (error) => {
            console.error("Error loading player model:", error);
        });
    }

    playAttack() {
        const attackAction = this.actions['attack'];
        if (attackAction && this.activeAction !== attackAction) {
            attackAction.reset();
            attackAction.setLoop(THREE.LoopOnce, 1);
            attackAction.clampWhenFinished = true;
            this.activeAction.crossFadeTo(attackAction, 0.1, true);
            attackAction.play();
            this.activeAction = attackAction;
        }
    }

    update(delta) {
        if (!this.mixer) return;

        this.mixer.update(delta);

        const attackAction = this.actions['attack'];

        // If attack is playing and has finished, transition back to idle
        if (this.activeAction === attackAction && !attackAction.isRunning()) {
            const idleAction = this.actions['idle'];
            idleAction.reset();
            idleAction.play();
            this.activeAction.crossFadeTo(idleAction, 0.2, true);
            this.activeAction = idleAction;
        }

        // Do not handle movement if an attack is playing
        if (this.activeAction === attackAction) {
             // While attacking, we might want to halt movement
            this.currentSpeed = 0;
            return; // Skip movement logic
        }

        // --- Movement Logic ---
        const isMoving = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
            
        if (isMoving) {
            this.targetSpeed = this.walkSpeed;
        } else {
            this.targetSpeed = 0;
        }

        if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed += this.acceleration * delta * 60;
            if (this.currentSpeed > this.targetSpeed) this.currentSpeed = this.targetSpeed;
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed -= this.deceleration * delta * 60;
            if (this.currentSpeed < this.targetSpeed) this.currentSpeed = this.targetSpeed;
        }

        const targetAction = (isMoving && this.currentSpeed > 0) ? this.actions['run'] : this.actions['idle'];

        if (this.activeAction !== targetAction) {
            targetAction.reset();
            targetAction.play();
            this.activeAction.crossFadeTo(targetAction, 0.05, true);
            this.activeAction = targetAction;
        }

        const direction = new THREE.Vector3();
        if (this.keys.ArrowUp) direction.z -= 1;
        if (this.keys.ArrowDown) direction.z += 1;
        if (this.keys.ArrowLeft) direction.x -= 1;
        if (this.keys.ArrowRight) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;

            const nextPosition = this.mesh.position.clone();
            nextPosition.add(direction.multiplyScalar(this.currentSpeed));

            if (this.canMoveTo(nextPosition)) {
                this.mesh.position.copy(nextPosition);
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }
}
