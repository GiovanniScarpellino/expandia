import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class Player {
    constructor(scene, canMoveTo) {
        this.scene = scene;
        this.canMoveTo = canMoveTo;
        this.health = 100;
        this.attackDamage = 10;
        this.moveSpeed = 0.04;
        
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

        const loadModel = (url) => {
            return new Promise((resolve, reject) => {
                new FBXLoader().load(url, resolve, undefined, reject);
            });
        };

        Promise.all([
            loadModel('/src/models/character.fbx'),
            loadModel('/src/models/idle.fbx'),
            loadModel('/src/models/run.fbx')
        ]).then(([character, idleAnim, runAnim]) => {
            this.scene.remove(this.mesh); // remove placeholder
            this.mesh = character;
            
            this.mesh.scale.set(0.001, 0.001, 0.001);
            this.mesh.position.set(0, -0.5, 0);

            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                }
            });
            this.scene.add(this.mesh);

            this.mixer = new THREE.AnimationMixer(this.mesh);

            const idleAction = this.mixer.clipAction(idleAnim.animations[0]);
            this.actions['idle'] = idleAction;

            const runAction = this.mixer.clipAction(runAnim.animations[0]);
            this.actions['run'] = runAction;

            this.activeAction = this.actions['idle'];
            this.activeAction.play();

        }).catch(error => {
            console.error("Error loading player models/animations:", error);
        });
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);

            const isMoving = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
            const targetAction = isMoving ? this.actions['run'] : this.actions['idle'];

            if (this.activeAction && targetAction && this.activeAction !== targetAction) {
                targetAction.reset();
                targetAction.play();
                this.activeAction.crossFadeTo(targetAction, 0.2, true);
                this.activeAction = targetAction;
            }
        }

        const nextPosition = this.mesh.position.clone();
        if (this.keys.ArrowUp) nextPosition.z -= this.moveSpeed;
        if (this.keys.ArrowDown) nextPosition.z += this.moveSpeed;
        if (this.keys.ArrowLeft) nextPosition.x -= this.moveSpeed;
        if (this.keys.ArrowRight) nextPosition.x += this.moveSpeed;

        if (this.canMoveTo(nextPosition)) {
            this.mesh.position.copy(nextPosition);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }
}
