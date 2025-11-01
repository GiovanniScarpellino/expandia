import * as BABYLON from '@babylonjs/core';
import { Pathfinder } from './Pathfinder.js';
import { COLLISION_GROUPS } from '../BabylonGame.js';

export class NPC {
    constructor(game, position, specialization) {
        this.game = game;
        this.scene = game.scene;
        this.specialization = specialization;

        this.state = 'IDLE'; // IDLE, MOVING_TO_RESOURCE, GATHERING
        this.path = [];
        this.target = null; // Can be a resource mesh

        // Config
        this.speed = 1.5; // units per second
        this.gatheringTime = 3; // seconds
        this.timer = 0;

        // Pathfinding & State Timers
        this.idleSearchCooldown = 2; // seconds
        this.idleSearchTimer = this.idleSearchCooldown; // Search immediately on first idle
        this.stuckTimer = 0;
        this.stuckCheckInterval = 1.0; // seconds
        this.lastPosition = null;

        // Create hitbox for movement and collision
        this.hitbox = BABYLON.MeshBuilder.CreateBox(`npcHitbox-${Math.random()}`, { width: 0.5, height: 1, depth: 0.5 }, this.scene);
        this.hitbox.position = position.clone();
        this.hitbox.position.y = 0.5; // Start on the ground
        this.hitbox.checkCollisions = true;
        this.hitbox.ellipsoid = new BABYLON.Vector3(0.25, 0.5, 0.25);
        this.hitbox.isVisible = false; // Set to true to debug
        this.lastPosition = this.hitbox.position.clone();

        // Collision groups
        this.hitbox.collisionGroup = COLLISION_GROUPS.NPC;
        this.hitbox.collisionMask = COLLISION_GROUPS.TERRAIN;

        // Create visual mesh (subclasses will override this)
        this.mesh = null;

        // --- Animations ---
        this.animations = {};
        this.activeAnimation = null;
    }

    playAnimation(name, loop = true, speed = 1.0) {
        const animation = this.animations[name];
        if (animation && this.activeAnimation !== animation) {
            if (this.activeAnimation) {
                this.activeAnimation.stop();
            }
            animation.start(loop, speed, animation.from, animation.to, false);
            this.activeAnimation = animation;
            return animation;
        }
        return null;
    }

    update(delta) {
        if (this.state === 'IDLE') {
            this.playAnimation('idle');
            this.idleSearchTimer += delta;
            if (this.idleSearchTimer >= this.idleSearchCooldown) {
                this.handleIdleState();
                this.idleSearchTimer = 0;
            }
        } else {
            switch (this.state) {
                case 'MOVING_TO_RESOURCE':
                    this.handleMoveState(delta, 'GATHERING');
                    break;
                case 'GATHERING':
                    this.handleGatheringState(delta);
                    break;
            }
        }
        this.hitbox.moveWithCollisions(new BABYLON.Vector3(0, -0.1, 0));
    }

    // This method should be overridden by subclasses
    handleIdleState() {
        // Generic NPC does nothing in idle state
    }

    handleMoveState(delta, nextState) {
        this.playAnimation('walk');

        // Stuck detection
        this.stuckTimer += delta;
        if (this.stuckTimer >= this.stuckCheckInterval) {
            const distanceMoved = BABYLON.Vector3.Distance(this.lastPosition, this.hitbox.position);
            if (distanceMoved < 0.1) { // Moved less than 10cm in 1 second
                if (this.target && this.target.mesh && this.target.mesh.metadata) {
                    this.target.mesh.metadata.isTargeted = false; // Release the target resource
                }
                this.target = null;
                this.state = 'IDLE';
                this.path = [];
                this.stuckTimer = 0;
                this.idleSearchTimer = this.idleSearchCooldown; // Force immediate search on next idle
                return; // Exit move state
            }
            this.lastPosition.copyFrom(this.hitbox.position);
            this.stuckTimer = 0;
        }

        if (this.path.length === 0) {
            this.state = nextState;
            return;
        }

        const nextWaypoint = this.path[0];
        const targetPosition = nextWaypoint.clone();
        targetPosition.y = this.hitbox.position.y;

        const direction = targetPosition.subtract(this.hitbox.position);
        const distance = direction.length();

        if (distance <= 1.0) { // Increased threshold
            this.path.shift();
        }
        else {
            this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z) + Math.PI, 0);
            const moveVector = direction.normalize().scale(this.speed * delta);
            this.hitbox.moveWithCollisions(moveVector);
        }

        if (this.path.length === 0) {
            this.state = nextState;
        }
    }

    handleGatheringState(delta) {
        this.playAnimation('gathering');
        this.timer += delta;
        if (this.timer >= this.gatheringTime) {
            this.timer = 0;
            if (this.target) {
                const anim = this.playAnimation('pick-up', false);
                if (anim) {
                    anim.onAnimationEndObservable.addOnce(() => this.finishGathering());
                } else {
                    this.finishGathering();
                }
            } else {
                 this.state = 'IDLE';
            }
        }
    }

    finishGathering() {
        if (this.target) {
            this.game.resourceManager.harvestResource(this.target);
            if (this.target.mesh.metadata) {
                this.target.mesh.metadata.isTargeted = false;
            }
            this.target = null;
        }
        // After gathering, immediately go back to idle to find a new resource
        this.state = 'IDLE';
        this.idleSearchTimer = this.idleSearchCooldown; // Force immediate search
    }

    findClosestReachableResource() {
        const targetType = this.resourceMap[this.specialization];
        if (!targetType) {
            console.error(`NPC has no resource target for specialization: ${this.specialization}`);
            return null;
        }

        const availableResources = this.game.resourceManager.resources.filter(
            r => r.type === targetType && r.mesh.isEnabled() && (!r.mesh.metadata || !r.mesh.metadata.isTargeted)
        );
    
        availableResources.sort((a, b) => {
            const distA = BABYLON.Vector3.DistanceSquared(this.hitbox.position, a.mesh.position);
            const distB = BABYLON.Vector3.DistanceSquared(this.hitbox.position, b.mesh.position);
            return distA - distB;
        });
    
        for (const resource of availableResources) {
            const path = Pathfinder.findPath(this.game.world, this.hitbox.position, resource.mesh.position);
            if (path && path.length > 0) {
                return { resource, path }; 
            }
        }
    
        return null;
    }
}
