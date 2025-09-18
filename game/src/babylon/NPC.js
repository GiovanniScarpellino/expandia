import * as BABYLON from '@babylonjs/core';
import { Pathfinder } from './Pathfinder.js';
import { COLLISION_GROUPS } from '../BabylonGame.js';

export class NPC {
    constructor(game, position, specialization) {
        this.game = game;
        this.scene = game.scene;
        this.specialization = specialization;
        this.resourceMap = {
            'LUMBERJACK': 'tree',
            'MINER': 'rock'
        };

        this.state = 'IDLE'; // IDLE, MOVING_TO_RESOURCE, GATHERING
        this.path = [];
        this.targetResource = null;

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
        this.hitbox.collisionMask = COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.WALL;

        // Create visual mesh
        this.mesh = this.game.models.npc.mesh.clone(`npcMesh-${Math.random()}`);
        this.mesh.setEnabled(true);
        this.mesh.parent = this.hitbox; // Parent visual mesh to hitbox
        this.mesh.position = new BABYLON.Vector3(0, -0.5, 0); // Center visual mesh in hitbox
        this.mesh.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
        
        this.game.addShadowCaster(this.hitbox); // Shadow caster should be on the moving part

        // --- Animations ---
        this.animations = {};
        this.activeAnimation = null;

        // Clone animation groups for this specific NPC instance and retarget them
        this.game.models.npc.animationGroups.forEach(group => {
            const newGroup = group.clone(group.name + "_npc_" + this.mesh.uniqueId, (oldTarget) => {
                const newTarget = this.mesh.getDescendants(false, (node) => {
                    const nameParts = node.name.split('.');
                    const lastPart = nameParts[nameParts.length - 1];
                    return lastPart === oldTarget.name;
                })[0];
                return newTarget;
            });
            this.animations[group.name] = newGroup;
        });
    }

    playAnimation(name, loop = true, speed = 1.0) {
        if (this.activeAnimation && this.activeAnimation.name.startsWith(name)) {
            return this.activeAnimation;
        }
        const animation = this.animations[name];
        if (animation) {
            if (this.activeAnimation) {
                this.activeAnimation.stop();
            }
            animation.start(loop, speed, animation.from, animation.to, false);
            this.activeAnimation = animation;
            return animation;
        } else {
            console.warn(`Animation "${name}" not found for NPC.`);
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

    handleIdleState() {
        const result = this.findClosestReachableResource();
        if (result) {
            this.targetResource = result.resource;
            this.path = result.path;
            this.targetResource.mesh.metadata.isTargeted = true;
            this.state = 'MOVING_TO_RESOURCE';
            this.idleSearchTimer = 0; // Reset timer after finding a path
        }
    }

    handleMoveState(delta, nextState) {
        this.playAnimation('walk');

        // Stuck detection
        this.stuckTimer += delta;
        if (this.stuckTimer >= this.stuckCheckInterval) {
            const distanceMoved = BABYLON.Vector3.Distance(this.lastPosition, this.hitbox.position);
            if (distanceMoved < 0.1) { // Moved less than 10cm in 1 second
                if (this.targetResource) {
                    this.targetResource.mesh.metadata.isTargeted = false; // Release the target
                    this.targetResource = null;
                }
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

        if (distance <= 0.1) {
            this.path.shift();
        } else {
            this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z) + Math.PI, 0);
            const moveVector = direction.normalize().scale(this.speed * delta);
            this.hitbox.moveWithCollisions(moveVector);
        }

        if (this.path.length === 0) {
            this.state = nextState;
        }
    }

    handleGatheringState(delta) {
        this.playAnimation('idle');
        this.timer += delta;
        if (this.timer >= this.gatheringTime) {
            this.timer = 0;
            if (this.targetResource) {
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
        if (this.targetResource) {
            const resourceType = this.game.resourceManager.harvestResource(this.targetResource);
            if (resourceType) {
                this.game.addResource(resourceType, 1);
            }
            this.targetResource = null;
        }
        // After gathering, immediately go back to idle to find a new resource
        this.state = 'IDLE';
        this.idleSearchTimer = this.idleSearchCooldown; // Force immediate search
    }

    findClosestReachableResource() {
        const targetType = this.resourceMap[this.specialization];
        if (!targetType) {
            console.error(`NPC has unknown specialization: ${this.specialization}`);
            return null;
        }

        const availableResources = this.game.resourceManager.resources.filter(
            r => r.type === targetType && r.mesh.isEnabled() && !r.mesh.metadata.isTargeted
        );
    
        availableResources.sort((a, b) => {
            const distA = BABYLON.Vector3.DistanceSquared(this.hitbox.position, a.mesh.position);
            const distB = BABYLON.Vector3.DistanceSquared(this.hitbox.position, b.mesh.position);
            return distA - distB;
        });
    
        for (const resource of availableResources) {
            const path = Pathfinder.findPath(this.game.world, this.hitbox.position, resource.mesh.position);
            if (path.length > 0) {
                return { resource, path }; 
            }
        }
    
        return null;
    }
}
