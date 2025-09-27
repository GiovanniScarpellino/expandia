import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';

const ANIMATIONS_NAME = {
    IDLE: 'idle',
    RUN: 'run',
    ATTACK: 'attack'
}

export class Player {
    constructor(game, mesh, scene, animationGroups) {
        this.game = game;
        this.scene = scene;

        const hitboxHeight = 1.0;

        // The visual mesh that the player sees
        this.mesh = mesh;
        const scaling = 0.005;

        // Apply a Z-offset to counteract the model's pivot point not being centered
        this.mesh.position = new BABYLON.Vector3(0, -hitboxHeight / 2, 0); 
        this.mesh.scaling = new BABYLON.Vector3(scaling, scaling, scaling);
        this.mesh.rotation = new BABYLON.Vector3(1.5, 0, 0); // Face forward
        this.mesh.checkCollisions = false; // The visual mesh itself doesn't collide
        this.mesh.getChildMeshes(true).forEach(m => m.checkCollisions = false);

        // The invisible collision hitbox
        const hitboxWidth = 0.5;
        const hitboxDepth = 0.5;
        this.hitbox = BABYLON.MeshBuilder.CreateBox("playerHitbox", { width: hitboxWidth, height: hitboxHeight, depth: hitboxDepth }, scene);
        this.hitbox.position = new BABYLON.Vector3(0, hitboxHeight / 2, 0); // Positioned at ground level
        this.hitbox.checkCollisions = true;
        this.hitbox.ellipsoid = new BABYLON.Vector3(hitboxWidth / 2, hitboxHeight / 2, hitboxDepth / 2); // Ellipsoid matches the hitbox dimensions
        this.hitbox.isVisible = false; // Make it true to debug

        // Collision groups
        this.hitbox.collisionGroup = COLLISION_GROUPS.PLAYER;
        this.hitbox.collisionMask = COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.WALL | COLLISION_GROUPS.RESOURCE;

        // Parent the visual mesh to the hitbox, so it follows automatically
        this.mesh.parent = this.hitbox;

        this.walkSpeed = 0.03;
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.acceleration = 0.005;
        this.deceleration = 0.01;

        this.keys = { z: false, s: false, q: false, d: false };
        this.inputHandler = this.setupInput();

        // Animations
        this.animations = {};
        this.activeAnimation = null;
        animationGroups.forEach(group => {
            let newName = group.name.toLowerCase();
            if(group.name.includes('|'))
                newName = newName.split('|').pop();

            this.animations[newName] = group;
            this.animations[newName].stop();
        });
        this.playAnimation(ANIMATIONS_NAME.IDLE);
        
        // State & Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isHarvesting = false;

        // Link takeDamage to hitbox metadata
        this.hitbox.metadata = {
            type: 'player',
            instance: this,
            takeDamage: (amount) => this.takeDamage(amount)
        };

        // TEMPORARY: Pivot adjustment controls
        const adjustmentIncrement = 0.1;
        const rotationIncrement = 0.1; // in radians
        if (!this.mesh.rotationQuaternion) {
            this.mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(this.mesh.rotation);
        }
        const adjustmentListener = (e) => {
            let updated = false;
            let rotationUpdated = false;
            switch (e.key) {
                case 'ArrowUp':
                    this.mesh.position.z += adjustmentIncrement;
                    updated = true;
                    break;
                case 'ArrowDown':
                    this.mesh.position.z -= adjustmentIncrement;
                    updated = true;
                    break;
                case 'ArrowLeft':
                    this.mesh.position.x -= adjustmentIncrement;
                    updated = true;
                    break;
                case 'ArrowRight':
                    this.mesh.position.x += adjustmentIncrement;
                    updated = true;
                    break;
                case 'PageUp':
                    this.mesh.position.y += adjustmentIncrement;
                    updated = true;
                    break;
                case 'PageDown':
                    this.mesh.position.y -= adjustmentIncrement;
                    updated = true;
                    break;
                case '7':
                    this.mesh.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -rotationIncrement));
                    rotationUpdated = true;
                    break;
                case '9':
                    this.mesh.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, rotationIncrement));
                    rotationUpdated = true;
                    break;
                case '1':
                    this.mesh.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, -rotationIncrement));
                    rotationUpdated = true;
                    break;
                case '3':
                    this.mesh.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, rotationIncrement));
                    rotationUpdated = true;
                    break;
                case '4':
                    this.mesh.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, -rotationIncrement));
                    rotationUpdated = true;
                    break;
                case '6':
                    this.mesh.rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, rotationIncrement));
                    rotationUpdated = true;
                    break;
            }
            if (updated) {
                e.preventDefault();
                console.log(`New mesh position: { x: ${this.mesh.position.x.toFixed(4)}, y: ${this.mesh.position.y.toFixed(4)}, z: ${this.mesh.position.z.toFixed(4)} }`);
            }
            if (rotationUpdated) {
                e.preventDefault();
                const eulerAngles = this.mesh.rotationQuaternion.toEulerAngles();
                console.log(`New mesh rotation quaternion: { x: ${eulerAngles.x.toFixed(4)}, y: ${eulerAngles.y.toFixed(4)}, z: ${eulerAngles.z.toFixed(4)} }`);
            }
        };
        window.addEventListener('keydown', adjustmentListener);
        // END TEMPORARY
    }

    playAnimation(name, loop = true, speed = 1.0) {
        if (this.activeAnimation && this.activeAnimation.name === name) return this.activeAnimation;
        if (this.isHarvesting && name !== ANIMATIONS_NAME.ATTACK) return null;

        const animation = this.animations[name];
        if (animation) {
            if (this.activeAnimation) {
                this.activeAnimation.stop();
            }
            animation.start(loop, speed, animation.from, animation.to, false);
            this.activeAnimation = animation;
            return animation;
        }
        return null;
    }

    setupInput() {
        const keydown = (e) => {
            // Allow exiting build mode anytime
            if (e.key === 'b' && this.game.buildingManager.isBuildingMode) {
                this.game.ui.toggleBuildMenu(false);
                return;
            }

            if (this.isHarvesting || this.game.buildingManager.isBuildingMode) {
                return; // Player input is disabled during these actions
            }

            if (e.key in this.keys) this.keys[e.key] = true;
            
            switch (e.key) {
                case 'e':
                    this.game.doContextualAction();
                    break;
                case 'b':
                    this.game.ui.toggleBuildMenu(true);
                    break;
                case ' ': // Spacebar
                    e.preventDefault();
                    this.attack();
                    break;
            }
        };

        const keyup = (e) => {
            if (e.key in this.keys) this.keys[e.key] = false;
        };

        window.addEventListener('keydown', keydown);
        window.addEventListener('keyup', keyup);

        return {
            dispose: () => {
                window.removeEventListener('keydown', keydown);
                window.removeEventListener('keyup', keyup);
            }
        };
    }

    attack() {
        // Attack logic removed as enemies are removed.
    }

    takeDamage(amount) {
        this.health -= amount;
        this.game.ui.updateHealth(this.health);

        if (this.health <= 0) {
            this.health = 0;
            console.error("GAME OVER - Le joueur a été vaincu !");
            // Here you would trigger a game over state
        }
    }

    playerHarvest(onHarvestComplete) {
        if (this.isHarvesting) return;
        this.isHarvesting = true;
        const animation = this.playAnimation(ANIMATIONS_NAME.ATTACK, false, 1.0);
        if (animation) {
            animation.onAnimationEndObservable.addOnce(() => {
                if (onHarvestComplete) onHarvestComplete();
                this.isHarvesting = false;
                this.playAnimation(ANIMATIONS_NAME.IDLE);
            });
        } else {
            setTimeout(() => {
                if (onHarvestComplete) onHarvestComplete();
                this.isHarvesting = false;
                this.playAnimation(ANIMATIONS_NAME.IDLE);
            }, 500);
        }
    }

    update(delta) {
        if (this.isHarvesting || this.game.buildingManager.isBuildingMode) {
            this.currentSpeed = 0;
            if (!this.isHarvesting) this.playAnimation(ANIMATIONS_NAME.IDLE);
            return; 
        }

        const isMoving = this.keys.z || this.keys.s || this.keys.q || this.keys.d;
        this.targetSpeed = isMoving ? this.walkSpeed : 0;

        if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + this.acceleration * delta * 60);
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed = Math.max(this.targetSpeed, this.currentSpeed - this.deceleration * delta * 60);
        }

        if (isMoving && this.currentSpeed > 0) {
            this.playAnimation(ANIMATIONS_NAME.RUN);
        } else {
            this.playAnimation(ANIMATIONS_NAME.IDLE);
        }

        const direction = new BABYLON.Vector3(0, 0, 0);
        if (this.keys.z) direction.z += 1;
        if (this.keys.s) direction.z -= 1;
        if (this.keys.q) direction.x -= 1;
        if (this.keys.d) direction.x += 1;

        if (direction.lengthSquared() > 0) {
            direction.normalize();
            
            this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z), 0);

            const moveVector = direction.scale(this.currentSpeed);
            const previousPosition = this.hitbox.position.clone();

            this.hitbox.moveWithCollisions(new BABYLON.Vector3(moveVector.x, 0, 0));
            if (!this.game.world.canMoveTo(this.hitbox.position)) {
                this.hitbox.position.x = previousPosition.x;
            }

            this.hitbox.moveWithCollisions(new BABYLON.Vector3(0, 0, moveVector.z));
            if (!this.game.world.canMoveTo(this.hitbox.position)) {
                this.hitbox.position.z = previousPosition.z;
            }
        }

        const gravity = new BABYLON.Vector3(0, -0.1, 0);
        this.hitbox.moveWithCollisions(gravity);
    }

    dispose() {
        this.inputHandler.dispose();
        this.hitbox.dispose();
    }
}