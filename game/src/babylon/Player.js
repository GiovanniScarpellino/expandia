import * as BABYLON from '@babylonjs/core';

export class Player {
    constructor(game, mesh, scene, animationGroups) {
        this.game = game;
        this.scene = scene;

        // The visual mesh that the player sees
        this.mesh = mesh;
        this.mesh.position = new BABYLON.Vector3(0, -0.5, 0); // Centered within the hitbox
        this.mesh.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
        this.mesh.checkCollisions = false; // The visual mesh itself doesn't collide

        // The invisible collision hitbox
        this.hitbox = BABYLON.MeshBuilder.CreateBox("playerHitbox", { width: 0.5, height: 1, depth: 0.5 }, scene);
        this.hitbox.position = new BABYLON.Vector3(0, 0.5, 0); // Positioned at ground level
        this.hitbox.checkCollisions = true;
        this.hitbox.ellipsoid = new BABYLON.Vector3(0.25, 0.5, 0.25); // Ellipsoid matches the hitbox dimensions
        this.hitbox.isVisible = false; // Make it true to debug

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
            this.animations[group.name] = group;
        });
        this.playAnimation('idle');
        
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
    }

    playAnimation(name, loop = true, speed = 1.0) {
        if (this.activeAnimation && this.activeAnimation.name === name) return this.activeAnimation;
        if (this.isHarvesting && name !== 'pick-up') return null;

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
        const animation = this.playAnimation('pick-up', false, 1.0);
        if (animation) {
            animation.onAnimationEndObservable.addOnce(() => {
                if (onHarvestComplete) onHarvestComplete();
                this.isHarvesting = false;
                this.playAnimation('idle');
            });
        } else {
            setTimeout(() => {
                if (onHarvestComplete) onHarvestComplete();
                this.isHarvesting = false;
                this.playAnimation('idle');
            }, 500);
        }
    }

    update(delta) {
        if (this.isHarvesting || this.game.buildingManager.isBuildingMode) {
            this.currentSpeed = 0;
            if (!this.isHarvesting) this.playAnimation('idle');
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
            this.playAnimation('walk');
        } else {
            this.playAnimation('idle');
        }

        const direction = new BABYLON.Vector3(0, 0, 0);
        if (this.keys.z) direction.z += 1;
        if (this.keys.s) direction.z -= 1;
        if (this.keys.q) direction.x -= 1;
        if (this.keys.d) direction.x += 1;

        if (direction.lengthSquared() > 0) {
            direction.normalize();
            
            this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z) + Math.PI, 0);

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