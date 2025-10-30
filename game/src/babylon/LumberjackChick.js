import * as BABYLON from '@babylonjs/core';
import { NPC } from './NPC.js';

export class LumberjackChick extends NPC {
    constructor(game, position) {
        super(game, position, 'LUMBERJACK');

        this.resourceMap = {
            'LUMBERJACK': 'tree',
        };

        this.gatheringTime = 5; // seconds

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

        // Use the idle animation for the gathering state as a fallback
        if (this.animations.idle) {
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
}
