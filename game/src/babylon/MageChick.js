import * as BABYLON from '@babylonjs/core';
import { NPC } from './NPC.js';
import { Pathfinder } from './Pathfinder.js';

export class MageChick extends NPC {
    constructor(game, position) {
        super(game, position, 'MAGE');
        this.speed = 1.0;
        this.repairTime = 5;
        this.repairCost = 5; // stones per repair

        this.state = 'IDLE';
        this.targetInteractable = null;

        // Instantiate the chick model from the asset container
        const chickContainer = this.game.models.chick;
        const instance = chickContainer.instantiateModelsToScene(name => `mageChick-${Math.random()}`);

        this.mesh = instance.rootNodes[0];
        this.mesh.parent = this.hitbox;
        this.mesh.position = new BABYLON.Vector3(0, -0.5, 0);
        this.mesh.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3);
        this.hitbox.rotation.x = 0;

        this.game.addShadowCaster(this.mesh);

        // Map the newly instantiated animation groups
        this.mapInstantiatedAnimations(instance.animationGroups, chickContainer.animationGroups);
        this.playAnimation('idle');
    }

    mapInstantiatedAnimations(newGroups, originalGroups) {
        this.animations = {};
        const animationMap = {
            "Armature|Idle": "idle",
            "Armature|Walk": "walk",
            "Armature|Sprint": "run",
            "Armature|Jump": "pick-up",
            "Armature|Grounded": "grounded",
        };

        for (let i = 0; i < originalGroups.length; i++) {
            const originalGroup = originalGroups[i];
            const newGroup = newGroups[i];

            if (newGroup) {
                newGroup.stop();
                const newName = animationMap[originalGroup.name];
                if (newName) {
                    this.animations[newName] = newGroup;
                }
            }
        }

        // Use the grounded animation for the repairing state
        if (this.animations.grounded) {
            this.animations.gathering = this.animations.grounded; // NPC state machine uses 'gathering'
        } else if (this.animations.idle) {
            this.animations.gathering = this.animations.idle;
        }
    }

    handleIdleState() {
        // Only search for a target if we have enough stone
        if (this.game.stone < this.repairCost) {
            return; // Not enough stone, do nothing
        }

        // Search for depleted interactables that are not already targeted
        const depletedInteractables = this.game.interactables.filter(i => 
            i.isDepleted && 
            (!i.mesh.metadata || !i.mesh.metadata.isTargeted) &&
            (i.resource.type === 'grave' || i.resource.type === 'chest')
        );

        if (depletedInteractables.length > 0) {
            depletedInteractables.sort((a, b) => {
                const distA = BABYLON.Vector3.DistanceSquared(this.hitbox.position, a.mesh.position);
                const distB = BABYLON.Vector3.DistanceSquared(this.hitbox.position, b.mesh.position);
                return distA - distB;
            });

            for (const interactable of depletedInteractables) {
                const path = Pathfinder.findPath(this.game.world, this.hitbox.position, interactable.mesh.position);
                if (path && path.length > 0) {
                    this.targetInteractable = interactable;
                    this.targetInteractable.mesh.metadata = this.targetInteractable.mesh.metadata || {};
                    this.targetInteractable.mesh.metadata.isTargeted = true;
                    this.path = path;
                    this.state = 'MOVING_TO_INTERACTABLE';
                    return; // Exit after finding a valid target
                }
            }
        }
    }

    // Override handleMoveState to reset timer on transition
    handleMoveState(delta, nextState) {
        const previousState = this.state;
        super.handleMoveState(delta, nextState);
        // If the state changed to REPAIRING, reset the timer
        if (this.state === 'REPAIRING' && previousState !== 'REPAIRING') {
            this.timer = 0;
        }
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
                case 'MOVING_TO_INTERACTABLE':
                    if (!this.targetInteractable || !this.targetInteractable.isDepleted) {
                        this.state = 'IDLE';
                        this.path = [];
                        if (this.targetInteractable && this.targetInteractable.mesh.metadata) {
                            this.targetInteractable.mesh.metadata.isTargeted = false;
                        }
                        this.targetInteractable = null;
                        return;
                    }
                    this.handleMoveState(delta, 'REPAIRING');
                    break;
                case 'REPAIRING':
                    this.playAnimation('gathering'); // Use gathering animation for repairing
                    this.timer += delta;
                    if (this.timer >= this.repairTime) {
                        this.finishRepairing();
                    }
                    break;
            }
        }
        this.hitbox.moveWithCollisions(new BABYLON.Vector3(0, -0.1, 0));
    }

    finishRepairing() {
        if (this.targetInteractable && this.targetInteractable.isDepleted) {
            if (this.game.stone >= this.repairCost) {
                this.game.addResource('rock', -this.repairCost);

                const resource = this.targetInteractable.resource;

                // Handle chest closing animation
                if (resource && resource.type === 'chest') {
                    const closeAnimation = resource.animationClose;
                    const openAnimation = resource.animation;

                    if (closeAnimation) {
                        closeAnimation.play(false);
                    } else if (openAnimation) {
                        // Play open animation in reverse
                        openAnimation.start(false, -1.0, openAnimation.to, openAnimation.from, false);
                    }
                }
                
                this.targetInteractable.reset();
                console.log(`Mage Chick repaired an interactable at ${this.targetInteractable.mesh.position.x}, ${this.targetInteractable.mesh.position.z}`);

            } else {
                console.log("Not enough stone to repair!");
            }
            if (this.targetInteractable.mesh.metadata) {
                this.targetInteractable.mesh.metadata.isTargeted = false;
            }
        }
        this.targetInteractable = null;
        this.state = 'IDLE';
        this.idleSearchTimer = this.idleSearchCooldown;
    }
}