import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, canMoveTo) {
        this.scene = scene;
        this.canMoveTo = canMoveTo;
        this.health = 100;
        this.attackDamage = 10;
        
        this.walkSpeed = 0.02; // Base walking speed
        this.sprintSpeed = 0.05; // Sprint speed
        this.currentSpeed = 0; // Current actual speed
        this.targetSpeed = 0; // Desired speed
        this.acceleration = 0.0005; // How fast to accelerate
        this.deceleration = 0.001; // How fast to decelerate
        
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
            ShiftLeft: false,
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

            if (idleClip) {
                this.actions['idle'] = this.mixer.clipAction(idleClip);
                this.activeAction = this.actions['idle'];
                this.activeAction.play();
            } else {
                console.warn("Animation 'idle' not found. Trying to use first animation as fallback.");
                if (gltf.animations.length > 0) {
                    this.actions['idle'] = this.mixer.clipAction(gltf.animations[0]);
                    this.activeAction = this.actions['idle'];
                    this.activeAction.play();
                } else {
                    console.error("No animations found in the model.");
                }
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

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);

            const isMoving = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
                
            // Determine target speed
            if (isMoving) {
                this.targetSpeed = this.keys.ShiftLeft ? this.sprintSpeed : this.walkSpeed;
            } else {
                this.targetSpeed = 0;
            }

            // Smoothly interpolate current speed
            if (this.currentSpeed < this.targetSpeed) {
                this.currentSpeed += this.acceleration * delta * 60; // Multiply by 60 for frame-rate independence
                if (this.currentSpeed > this.targetSpeed) this.currentSpeed = this.targetSpeed;
            } else if (this.currentSpeed > this.targetSpeed) {
                this.currentSpeed -= this.deceleration * delta * 60;
                if (this.currentSpeed < this.targetSpeed) this.currentSpeed = this.targetSpeed;
            }

            const targetAction = (isMoving && this.currentSpeed > 0) ? this.actions['run'] : this.actions['idle'];

            if (this.activeAction && targetAction && this.activeAction !== targetAction) {
                targetAction.reset();
                targetAction.play();
                this.activeAction.crossFadeTo(targetAction, 0.2, true);
                this.activeAction = targetAction;
            }
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
            nextPosition.add(direction.multiplyScalar(this.currentSpeed)); // Use currentSpeed

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
