import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, canMoveTo) {
        this.scene = scene;
        this.canMoveTo = canMoveTo;
        this.health = 100;
        this.postureAttackDamage = 35;
        this.ruptureAttackDamage = 100;
        
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

            const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle');
            const runClip = THREE.AnimationClip.findByName(gltf.animations, 'walk');
            const attackClip = THREE.AnimationClip.findByName(gltf.animations, 'attack-melee-right');
            const pickupClip = THREE.AnimationClip.findByName(gltf.animations, 'pick-up');

            if (idleClip) {
                this.actions['idle'] = this.mixer.clipAction(idleClip);
                this.activeAction = this.actions['idle'];
                this.activeAction.play();
            } else {
                console.warn("Animation 'idle' not found.");
            }

            if (runClip) this.actions['run'] = this.mixer.clipAction(runClip);
            if (attackClip) this.actions['attack'] = this.mixer.clipAction(attackClip);
            if (pickupClip) this.actions['pickup'] = this.mixer.clipAction(pickupClip);

        }, undefined, (error) => {
            console.error("Error loading player model:", error);
        });
    }

    playAction(actionName, loopOnce = true) {
        const action = this.actions[actionName];
        if (action && this.activeAction !== action) {
            action.reset();
            if (loopOnce) {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
            }
            this.activeAction.crossFadeTo(action, 0.1, true);
            action.play();
            this.activeAction = action;
            return action; // Return the action to check its duration or status
        }
        return null;
    }

    update(delta) {
        if (!this.mixer) return;

        this.mixer.update(delta);

        const attackAction = this.actions['attack'];
        const pickupAction = this.actions['pickup'];

        // If a one-shot animation is playing and has finished, transition back to idle
        if ((this.activeAction === attackAction || this.activeAction === pickupAction) && !this.activeAction.isRunning()) {
            this.playAction('idle', false);
        }

        // Do not handle movement if a blocking animation is playing
        if (this.activeAction === attackAction || this.activeAction === pickupAction) {
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
            this.playAction(targetAction.getClip().name, false);
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
