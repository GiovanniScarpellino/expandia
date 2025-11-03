import * as BABYLON from '@babylonjs/core';
import { NPC } from './NPC.js';
import { Pathfinder } from './Pathfinder.js';

export class ExplorerChick extends NPC {
    constructor(game, position) {
        super(game, position, 'EXPLORER');

        this.resourceMap = {
            'EXPLORER': 'locked_tile',
        };

        this.gatheringTime = 10; // 10 seconds to unlock a tile

        // Instantiate the chick model from the asset container
        const chickContainer = this.game.models.chick;
        const instance = chickContainer.instantiateModelsToScene();

        this.mesh = instance.rootNodes[0];
        this.mesh.parent = this.hitbox;
        // Set final scale and position
        this.mesh.position = new BABYLON.Vector3(0, -0.5, 0);
        this.mesh.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3);
        this.hitbox.rotation.x = 0;

        // Add the visible mesh to the shadow generator
        this.game.addShadowCaster(this.mesh);

        // Map the newly instantiated animation groups to our game's animation names
        this.mapInstantiatedAnimations(instance.animationGroups, chickContainer.animationGroups);
    }

    mapInstantiatedAnimations(newGroups, originalGroups) {
        this.animations = {};
        // Updated map for Chicken_Guy.glb
        const animationMap = {
            "Armature|Idle": "idle",
            "Armature|Walk": "walk",
            "Armature|Sprint": "run",
            "Armature|Jump": "pick-up", // Using Jump for the "pick-up" action
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

        // Use the grounded animation for the gathering state
        if (this.animations.grounded) {
            this.animations.gathering = this.animations.grounded;
        } else if (this.animations.idle) {
            // Fallback to idle if grounded is not available
            this.animations.gathering = this.animations.idle;
        }
    }

    handleIdleState() {
        const result = this.findClosestReachableResource();
        if (result) {
            this.target = result.resource;
            this.path = result.path;
            // Mark the resource as targeted so other chicks don't go for it
            this.target.mesh.metadata = this.target.mesh.metadata || {};
            this.target.mesh.metadata.isTargeted = true;
            this.state = 'MOVING_TO_RESOURCE';
        }
    }

    finishGathering() {
        if (this.target && this.target.visualMesh) {
            this.game.world.unlockTile(this.target.visualMesh.metadata.x, this.target.visualMesh.metadata.z, true);
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
        if (this.game.wood < 1) { // Check for resources
            return null;
        }

        const availableResources = this.game.scene.meshes.filter(
            m => m.metadata && m.metadata.interactable && m.metadata.type === 'tile' && !m.metadata.unlocked && !m.metadata.isTargeted
        ).map(m => m.metadata.interactable);

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
