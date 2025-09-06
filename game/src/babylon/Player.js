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
        this.isHarvesting = false; // New state variable
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
            // Prevent actions if player is busy or build menu is open
            if (this.isHarvesting || this.game.ui.buildMenu.style.display === 'flex') {
                if(e.key === 'Escape') this.game.ui.toggleBuildMenu(false); // Still allow closing menu
                return;
            }

            if (e.key in this.keys) this.keys[e.key] = true;
            
            switch (e.key) {
                case 'e':
                    if (this.game.buildingManager.isBuildingMode) {
                        this.game.buildingManager.placeWall();
                    } else {
                        this.game.doContextualAction();
                    }
                    break;
                case 'b':
                    this.game.ui.toggleBuildMenu(true);
                    break;
                case 'Escape':
                    if (this.game.buildingManager.isBuildingMode) {
                        this.game.buildingManager.exitBuildMode();
                    }
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

    playerHarvest(onHarvestComplete) {
        if (this.isHarvesting) return;
        this.isHarvesting = true; // Set harvesting state to true
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
            this.playAnimation('idle');
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
            
            this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z) + Math.PI, 0); // Add PI for 180-degree flip

            const moveVector = direction.scale(this.currentSpeed);
            const previousPosition = this.hitbox.position.clone();

            // Move on X axis
            this.hitbox.moveWithCollisions(new BABYLON.Vector3(moveVector.x, 0, 0));
            if (!this.game.world.canMoveTo(this.hitbox.position)) {
                this.hitbox.position.x = previousPosition.x;
            }

            // Move on Z axis
            this.hitbox.moveWithCollisions(new BABYLON.Vector3(0, 0, moveVector.z));
            if (!this.game.world.canMoveTo(this.hitbox.position)) {
                this.hitbox.position.z = previousPosition.z;
            }
        }

        // Apply a constant downward force to keep the player grounded
        const gravity = new BABYLON.Vector3(0, -0.1, 0);
        this.hitbox.moveWithCollisions(gravity);
    }

    dispose() {
        this.inputHandler.dispose();
        this.hitbox.dispose(); // This will also dispose the child mesh
    }
}