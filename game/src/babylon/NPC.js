import * as BABYLON from '@babylonjs/core';
import { Pathfinder } from './Pathfinder.js';

export class NPC {
    constructor(game, position) {
        this.game = game;
        this.scene = game.scene;
        this.state = 'IDLE'; // IDLE, MOVING_TO_RESOURCE, GATHERING, MOVING_TO_BASE
        this.path = [];
        this.targetResource = null;
        this.cargo = null; // What the NPC is carrying

        // Config
        this.speed = 1.5; // units per second
        this.gatheringTime = 3; // seconds
        this.timer = 0;

        // Create hitbox for movement and collision
        this.hitbox = BABYLON.MeshBuilder.CreateBox(`npcHitbox-${Math.random()}`, { width: 0.5, height: 1, depth: 0.5 }, this.scene);
        this.hitbox.position = position.clone();
        this.hitbox.position.y = 0.5; // Start on the ground
        this.hitbox.checkCollisions = true;
        this.hitbox.ellipsoid = new BABYLON.Vector3(0.25, 0.5, 0.25);
        this.hitbox.isVisible = false; // Set to true to debug

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
            // Clone the animation group, giving it a new name
            const newGroup = group.clone(group.name + "_npc_" + this.mesh.uniqueId, (oldTarget) => {
                // This function remaps the animation targets from the old skeleton to the new one.
                // It handles the prefixing that Babylon.js can add to cloned node names.
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
        // Avoid restarting the same animation
        if (this.activeAnimation && this.activeAnimation.name.startsWith(name)) {
            return this.activeAnimation;
        }

        const animation = this.animations[name];
        if (animation) {
            if (this.activeAnimation) {
                this.activeAnimation.stop();
            }
            // This line can fail if the animation group is corrupted (e.g., with null targets)
            animation.start(loop, speed, animation.from, animation.to, false);
            this.activeAnimation = animation;
            return animation;
        } else {
            console.warn(`Animation "${name}" not found for NPC. Available animations:`, Object.keys(this.animations));
        }
        return null;
    }

    update(delta) {
        switch (this.state) {
            case 'IDLE':
                this.handleIdleState();
                break;
            case 'MOVING_TO_RESOURCE':
                this.handleMoveState(delta, 'GATHERING');
                break;
            case 'GATHERING':
                this.handleGatheringState(delta);
                break;
            case 'MOVING_TO_BASE':
                this.handleMoveState(delta, 'IDLE');
                break;
        }
        // Apply gravity
        this.hitbox.moveWithCollisions(new BABYLON.Vector3(0, -0.1, 0));
    }

    handleIdleState() {
        this.playAnimation('idle');
        const closestResource = this.findClosestAvailableResource();
        if (closestResource) {
            this.targetResource = closestResource;
            this.targetResource.mesh.metadata.isTargeted = true;

            const path = Pathfinder.findPath(this.game.world, this.hitbox.position, this.targetResource.mesh.position);
            if (path.length > 0) {
                this.path = path;
                this.state = 'MOVING_TO_RESOURCE';
            } else {
                this.targetResource.mesh.metadata.isTargeted = false;
                this.targetResource = null;
            }
        }
    }

    handleMoveState(delta, nextState) {
        this.playAnimation('walk');

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
            this.path.shift(); // Reached waypoint
        } else {
            // Correct rotation by adding 180 degrees (PI radians)
            this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z) + Math.PI, 0);
            
            const moveVector = direction.normalize().scale(this.speed * delta);
            this.hitbox.moveWithCollisions(moveVector);
        }

        if (this.path.length === 0) {
            // Final arrival check for this frame
            if (nextState === 'IDLE' && this.cargo) {
                this.game.addResource(this.cargo, 1);
                this.cargo = null;
            }
            this.state = nextState;
        }
    }

    handleGatheringState(delta) {
        this.playAnimation('idle'); // Stand still while gathering timer counts
        this.timer += delta;
        if (this.timer >= this.gatheringTime) {
            this.timer = 0;

            if (this.targetResource) {
                // Play gathering animation (and handle deposit in callback)
                const anim = this.playAnimation('pick-up', false);
                if (anim) {
                    anim.onAnimationEndObservable.addOnce(() => {
                        this.finishGathering();
                    });
                } else {
                    this.finishGathering(); // Fallback if animation fails
                }
            } else {
                 this.state = 'IDLE'; // Target lost
            }
        }
    }

    finishGathering() {
        if (this.targetResource) {
            const resourceType = this.game.resourceManager.harvestResource(this.targetResource);
            if (resourceType) {
                this.cargo = resourceType;
            }
            this.targetResource = null; // Resource is gone
        }

        const path = Pathfinder.findPath(this.game.world, this.hitbox.position, this.game.base.position);
        if (path.length > 0) {
            this.path = path;
            this.state = 'MOVING_TO_BASE';
        } else {
            this.state = 'IDLE'; // Can't find path back to base
        }
    }

    findClosestAvailableResource() {
        let closestResource = null;
        let minDistance = Infinity;

        this.game.resourceManager.resources.forEach(resource => {
            if (!resource.mesh.isEnabled() || resource.mesh.metadata.isTargeted) return;
            
            const distance = BABYLON.Vector3.Distance(this.hitbox.position, resource.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestResource = resource;
            }
        });

        return closestResource;
    }
}