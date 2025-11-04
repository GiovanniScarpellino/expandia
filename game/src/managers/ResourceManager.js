import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';
import { Interactable } from '../babylon/Interactable.js';

// Simple class to hold resource data
class Resource {
    constructor(mesh, type, visualMesh = null, keepOnCollect, gain, animation, interactable = null, animationClose = null) {
        this.mesh = mesh;
        this.type = type;
        this.initialPosition = mesh.position.clone();
        this.visualMesh = visualMesh || mesh;
        this.keepOnCollect = keepOnCollect;
        this.gain = gain;
        this.animation = animation; // open animation
        this.animationClose = animationClose; // close animation
        this.interactable = interactable;
    }
}

export class ResourceManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.resources = [];
        this.respawnQueue = [];
        this.respawnTime = 10000; // 10 seconds
    }

    initialize() {
        // Resources are now spawned procedurally by World.js
    }

    spawnResource(position, explicitType = null) {
        // Prevent spawning if the player is too close
        if (this.game.player && BABYLON.Vector3.Distance(this.game.player.hitbox.position, position) < 1.0) {
            console.log("Player is too close, resource will not spawn.");
            return;
        }

        let typeToSpawn = explicitType;

        if (!explicitType) {
            const random = Math.random();
            const graveChance = 0.15; // 15% chance for a grave
            const rockChance = 0.30;  // 30% chance for a rock
            const chestChance = 0.20;

            // 1. Grave check (only after 10 tiles unlocked)
            if (random < graveChance) {
                typeToSpawn = 'grave';
            } else if (random < graveChance + rockChance) { // 2. Rock check
                typeToSpawn = 'rock';
            } else if (random < graveChance + rockChance + chestChance) {
                typeToSpawn = 'chest';
            } else { // 3. Default to Tree
                typeToSpawn = 'tree';
            }
        }

        let model;
        let resource;
        let newInteractable;

        if (typeToSpawn === 'grave') {
            const graveMesh = BABYLON.MeshBuilder.CreateBox("grave", { width: 1, height: 2, depth: 0.5 }, this.scene);
            graveMesh.position = position.clone();
            graveMesh.position.y = 1;
            const graveMaterial = new BABYLON.StandardMaterial("graveMat", this.scene);
            graveMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.8); // A purplish color
            graveMesh.material = graveMaterial;
            graveMesh.checkCollisions = true;
            graveMesh.collisionGroup = COLLISION_GROUPS.WALL;
            graveMesh.isPickable = true;

            resource = new Resource(graveMesh, typeToSpawn, graveMesh, false, 0, null);
            newInteractable = new Interactable(graveMesh, 2, () => {
                this.game.startCombat(resource);
            });
            resource.interactable = newInteractable;
            newInteractable.resource = resource; // Link back

            this.game.graves.push(graveMesh);
            this.game.addShadowCaster(graveMesh);
        } else {
            if (typeToSpawn === 'tree') {
                model = this.game.models.tree;
            } else if (typeToSpawn === 'rock') {
                model = this.game.models.rock;
            } else if (typeToSpawn === 'chest') {
                model = this.game.models.chest;
            }

            if (model) {
                if (typeToSpawn === 'rock') {
                    const rockMesh = model.mesh.clone(`rock-visual-${this.resources.length}`);
                    rockMesh.setEnabled(true);
                    rockMesh.getChildMeshes().forEach(m => m.checkCollisions = false);

                    const collisionBox = BABYLON.MeshBuilder.CreateBox(`rock-collision-${this.resources.length}`, { width: 0.8, height: 0.8, depth: 0.8 }, this.scene);
                    collisionBox.position = position.clone();
                    collisionBox.position.y = 0.4;
                    collisionBox.isVisible = false;
                    collisionBox.checkCollisions = true;
                    collisionBox.collisionGroup = COLLISION_GROUPS.WALL;
                    collisionBox.isPickable = true;

                    rockMesh.parent = collisionBox;
                    rockMesh.position.y = -0.4;

                    this.game.addShadowCaster(rockMesh);
                    
                    resource = new Resource(collisionBox, typeToSpawn, rockMesh, false, 1, null);
                    newInteractable = new Interactable(collisionBox, 2, () => {
                        this.game.player.startHarvesting(resource);
                    }, rockMesh);
                    resource.interactable = newInteractable;
                    newInteractable.resource = resource; // Link back
                } else if (typeToSpawn === 'chest') {
                    const chestMesh = model.mesh.clone(`chest-visual-${this.resources.length}`);
                    chestMesh.setEnabled(true);
                    chestMesh.getChildMeshes().forEach(m => m.checkCollisions = false);
                    chestMesh.rotation = new BABYLON.Vector3(0, Math.PI * 2, 0);

                    if (model.mesh.skeleton) {
                        chestMesh.skeleton = model.mesh.skeleton.clone(`skeleton-chest-${this.resources.length}`);
                    }

                    const collisionBox = BABYLON.MeshBuilder.CreateBox(`chest-collision-${this.resources.length}`, { width: 0.8, height: 0.8, depth: 0.8 }, this.scene);
                    collisionBox.position = position.clone();
                    collisionBox.position.y = 0.4;
                    collisionBox.isVisible = false;
                    collisionBox.checkCollisions = true;
                    collisionBox.collisionGroup = COLLISION_GROUPS.WALL;
                    collisionBox.isPickable = true;

                    chestMesh.parent = collisionBox;
                    chestMesh.position.y = -0.4;

                    this.game.addShadowCaster(chestMesh);

                    // Clone open animation
                    const openAnim = model.animationGroups.find(aG => aG.name === 'open').clone(`openClone-${this.resources.length}`);
                    openAnim.targetedAnimations.forEach((ta) => {
                        const target = chestMesh.getChildMeshes(false, m => m.name.endsWith(ta.target.name.split('.').pop()))[0];
                        if(target) ta.target = target;
                    });

                    // Clone close animation
                    let closeAnim = null;
                    const closeAnimOrig = model.animationGroups.find(aG => aG.name === 'close');
                    if (closeAnimOrig) {
                        closeAnim = closeAnimOrig.clone(`closeClone-${this.resources.length}`);
                        closeAnim.targetedAnimations.forEach((ta) => {
                            const target = chestMesh.getChildMeshes(false, m => m.name.endsWith(ta.target.name.split('.').pop()))[0];
                            if(target) ta.target = target;
                        });
                    }

                    resource = new Resource(collisionBox, typeToSpawn, chestMesh, true, 10, openAnim, null, closeAnim);
                    newInteractable = new Interactable(collisionBox, 2, () => {
                        this.game.player.startHarvesting(resource);
                    }, chestMesh);
                    resource.interactable = newInteractable;
                    newInteractable.resource = resource; // Link back

                    // Ensure chest is closed at spawn
                    if (resource.animationClose) {
                        resource.animationClose.play(false);
                    } else if (resource.animation) {
                        resource.animation.start(false, -1.0, resource.animation.to, resource.animation.from, false);
                    }
                } else { // For trees
                    const newMesh = model.mesh.clone(`${typeToSpawn}-${this.resources.length}`);
                    newMesh.position = position.clone();
                    newMesh.setEnabled(true);
                    newMesh.isPickable = true;

                    newMesh.getChildMeshes().forEach(m => {
                        m.checkCollisions = true;
                        m.collisionGroup = COLLISION_GROUPS.WALL;
                    });

                    this.game.addShadowCaster(newMesh);
                    
                    resource = new Resource(newMesh, typeToSpawn, newMesh, false, 1, null);
                    newInteractable = new Interactable(newMesh, 2, () => {
                        this.game.player.startHarvesting(resource);
                    }, newMesh);
                    resource.interactable = newInteractable;
                    newInteractable.resource = resource; // Link back
                }
            }
        }

        if (resource) {
            this.resources.push(resource);
            if (newInteractable) {
                this.game.addInteractable(newInteractable);
            }
        }
    }

    update(delta) {
        const now = Date.now();
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const item = this.respawnQueue[i];
            if (now >= item.respawnTime) {
                const resource = item.resource;

                // Re-enable the main mesh (the collision box for rocks)
                resource.mesh.setEnabled(true);

                if (resource.interactable) {
                    resource.interactable.reset(); // This will re-enable the visual mesh
                }
                
                // Re-enable collisions
                if (resource.type === 'rock') {
                    resource.mesh.checkCollisions = true;
                }
                else {
                    resource.mesh.getChildMeshes().forEach(m => m.checkCollisions = true);
                }
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    harvestResource(resource) {
        if (resource && resource.mesh.isEnabled()) {
            if (resource.type === 'chest') {
                if (resource.interactable) {
                    if (resource.animation) {
                        resource.animation.play(false);
                    }
                    this.game.addResource(resource.type, resource.gain);
                    this.game.addScore(1, 'exploration');
                    resource.interactable.deplete(); // Mark as depleted
                }
                return; // Chests are not disabled or put in respawn queue
            }

            if (resource.interactable) {
                resource.interactable.deplete(); // Mark as depleted
            }

            resource.mesh.setEnabled(!!resource.keepOnCollect);
            resource.mesh.getChildMeshes().forEach(m => m.checkCollisions = false);

            if (!resource.keepOnCollect) {
                this.respawnQueue.push({ resource: resource, respawnTime: Date.now() + this.respawnTime });
            }

            this.game.addResource(resource.type, resource.gain);
            this.game.addScore(1, 'exploration');
        }
    }
}