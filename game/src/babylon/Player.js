import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';
import { Projectile } from './Projectile.js';

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

        // The invisible collision hitbox
        const hitboxWidth = 0.5;
        const hitboxDepth = 0.5;
        this.hitbox = BABYLON.MeshBuilder.CreateBox("playerHitbox", { width: hitboxWidth, height: hitboxHeight, depth: hitboxDepth }, scene);
        this.hitbox.position = new BABYLON.Vector3(0, hitboxHeight / 2, 0);
        this.hitbox.checkCollisions = true;
        this.hitbox.ellipsoid = new BABYLON.Vector3(hitboxWidth / 2, hitboxHeight / 2, hitboxDepth / 2);
        this.hitbox.isVisible = false;
        this.hitbox.applyGravity = true; // Use scene's gravity

        // Parent the visual mesh to the hitbox, so it follows automatically
        this.mesh.parent = this.hitbox;
        this.mesh.position.y = -hitboxHeight / 2;

        // Collision groups
        this.hitbox.collisionGroup = COLLISION_GROUPS.PLAYER;
        this.hitbox.collisionMask = COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.WALL | COLLISION_GROUPS.NPC;

        // Movement
        this.walkSpeed = 5; // Adjusted for delta time
        this.keys = { z: false, s: false, q: false, d: false };
        this.inputHandler = this.setupInput();

        // Animations
        this.animations = {};
        this.activeAnimation = null;
        animationGroups.forEach(group => {
            let newName = group.name.toLowerCase();
            if (group.name.includes('|'))
                newName = newName.split('|').pop();

            this.animations[newName] = group;
            this.animations[newName].stop();
        });

        // State & Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.attackSpeed = 500; // ms per attack
        this.lastAttackTime = 0;
        this.projectileSpeedModifier = 1;

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpForNextLevel = 100;

        // Link takeDamage to hitbox metadata
        this.hitbox.metadata = {
            type: 'player',
            instance: this,
            takeDamage: (amount) => this.takeDamage(amount)
        };

        // Initial UI update
        this.game.ui.updateXpBar(this.xp, this.xpForNextLevel, this.level);
    }

    addXp(amount) {
        this.xp += amount;
        if (this.xp >= this.xpForNextLevel) {
            this.levelUp();
        }
        this.game.ui.updateXpBar(this.xp, this.xpForNextLevel, this.level);
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpForNextLevel;
        this.xpForNextLevel = Math.floor(this.xpForNextLevel * 1.5);
        console.log(`%cLEVEL UP! Now level ${this.level}`, 'color: yellow; font-size: 1.2em;');
        this.game.ui.updateXpBar(this.xp, this.xpForNextLevel, this.level);
        this.game.startLevelUp();
    }

    playAnimation(name, loop = true, speed = 1.0) {
        if (this.activeAnimation && this.activeAnimation.name === name) return this.activeAnimation;

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
            const key = e.key.toLowerCase();
            if (key in this.keys) this.keys[key] = true;
        };

        const keyup = (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) this.keys[key] = false;
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
        const now = Date.now();
        if (now - this.lastAttackTime < this.attackSpeed) return;

        this.lastAttackTime = now;

        // Create and launch projectile towards the mouse position
        const targetPosition = this.game.mousePositionInWorld.clone();
        targetPosition.y = this.hitbox.position.y; // Aim straight!

        this.game.addProjectile(new Projectile(this.game, this.hitbox.position.clone(), targetPosition, this.projectileSpeedModifier));
        
        // Play attack animation
        // this.playAnimation(ANIMATIONS_NAME.ATTACK, false, 1.5);
    }

    takeDamage(amount) {
        this.health -= amount;
        this.game.ui.updateHealth(this.health, this.maxHealth);

        if (this.health <= 0) {
            this.health = 0;
            console.error("GAME OVER - Le joueur a été vaincu !");
            this.game.gameOver();
        }
    }

    update(delta) {
        const isMoving = this.keys.z || this.keys.s || this.keys.q || this.keys.d;

        // --- Rotation --- 
        const mousePosition = this.game.mousePositionInWorld;
        if (mousePosition) {
            const direction = mousePosition.subtract(this.hitbox.position);
            direction.y = 0; // Keep rotation on the horizontal plane
            if (direction.lengthSquared() > 0.01) { // Add a small deadzone
                 this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z), 0);
            }
        }

        // --- Movement (World-axis based) --- 
        if (isMoving) {
            // this.playAnimation(ANIMATIONS_NAME.RUN);

            const direction = new BABYLON.Vector3(0, 0, 0);
            if (this.keys.z) direction.z += 1;
            if (this.keys.s) direction.z -= 1;
            if (this.keys.q) direction.x -= 1;
            if (this.keys.d) direction.x += 1;

            if (direction.lengthSquared() > 0) {
                direction.normalize();
                const moveVector = direction.scale(this.walkSpeed * delta);
                this.hitbox.moveWithCollisions(moveVector);
            }
        } else {
            // this.playAnimation(ANIMATIONS_NAME.IDLE);
        }
    }

    dispose() {
        this.inputHandler.dispose();
        this.hitbox.dispose();
    }
}