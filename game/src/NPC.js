import * as THREE from 'three';
import { Pathfinding } from './utils/Pathfinding.js';

export class NPC {
    constructor(scene, position, model, animations) {
        this.scene = scene;
        this.mesh = model;
        this.mesh.position.copy(position);
        this.mesh.scale.set(0.1, 0.1, 0.1);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.material = child.material.clone();
                child.material.color.setHex(0x0000ff);
            }
        });

        this.scene.add(this.mesh);
        this.speed = 0.02; // Adjusted for animation

        // --- ANIMATION ---
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.actions = {};
        this.activeAction = null;

        const idleClip = THREE.AnimationClip.findByName(animations, 'idle');
        const walkClip = THREE.AnimationClip.findByName(animations, 'walk');
        const pickupClip = THREE.AnimationClip.findByName(animations, 'pick-up');

        if (idleClip) this.actions['idle'] = this.mixer.clipAction(idleClip);
        if (walkClip) this.actions['walk'] = this.mixer.clipAction(walkClip);
        if (pickupClip) this.actions['pickup'] = this.mixer.clipAction(pickupClip);

        // --- STATE ---
        this.state = 'IDLE';
        this.target = null;
        this.path = null;
        this.harvestingStartTime = 0;

        this.setActiveAction(this.actions['idle']);
    }

    setActiveAction(action) {
        if (this.activeAction === action || !action) return;

        if (this.activeAction) {
            this.activeAction.fadeOut(0.2);
        }
        
        this.activeAction = action;
        this.activeAction.reset().fadeIn(0.2).play();
    }

    update(resources, game, delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }

        const now = Date.now();

        if (this.state === 'IDLE') {
            this.setActiveAction(this.actions['idle']);
            let closestResource = null;
            let minDistance = Infinity;
            resources.forEach(resource => {
                if (resource.mesh.parent && !resource.mesh.userData.targeted && game.world.canMoveTo(resource.mesh.position)) {
                    const distance = this.mesh.position.distanceTo(resource.mesh.position);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestResource = resource;
                    }
                }
            });

            if (closestResource) {
                const startCoords = game.world.getTileCoordinates(this.mesh.position);
                const endCoords = game.world.getTileCoordinates(closestResource.mesh.position);

                if (startCoords.x === endCoords.x && startCoords.z === endCoords.z) {
                    this.target = closestResource;
                    closestResource.mesh.userData.targeted = true;
                    this.state = 'HARVESTING';
                    this.harvestingStartTime = now;
                } else {
                    const path = Pathfinding.findPath(this.mesh.position, closestResource.mesh.position, game.world);
                    if (path && path.length > 1) {
                        this.target = closestResource;
                        closestResource.mesh.userData.targeted = true;
                        this.path = path;
                        this.path.shift(); 
                        this.state = 'MOVING_TO_RESOURCE';
                    }
                }
            }
        } else if (this.state === 'MOVING_TO_RESOURCE') {
            this.setActiveAction(this.actions['walk']);
            if (this.target && this.target.mesh.parent && this.path && this.path.length > 0) {
                const targetPos = new THREE.Vector3(this.path[0].x * game.world.tileSize, this.mesh.position.y, this.path[0].z * game.world.tileSize);
                
                const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
                if (direction.length() > 0.01) {
                    const angle = Math.atan2(direction.x, direction.z);
                    this.mesh.rotation.y = angle;
                    direction.normalize();
                    this.mesh.position.add(direction.multiplyScalar(this.speed));
                }

                if (this.mesh.position.distanceTo(targetPos) < 0.1) {
                    this.path.shift();
                    if (this.path.length === 0) {
                        this.state = 'HARVESTING';
                        this.harvestingStartTime = now;
                    }
                }
            } else {
                this.state = 'IDLE';
                if (this.target) {
                    this.target.mesh.userData.targeted = false;
                    this.target = null;
                }
                this.path = null;
            }
        } else if (this.state === 'HARVESTING') {
            this.setActiveAction(this.actions['pickup']);
            if (now - this.harvestingStartTime > 2000) { // 2 seconds to harvest
                if (this.target && this.target.mesh.parent) {
                    const resourceType = game.resourceManager.harvestResource(this.target, this);
                    if(resourceType){
                        game.addResource(resourceType, 1);
                    }
                }
                if (this.target) {
                    this.target.mesh.userData.targeted = false;
                }
                this.target = null;
                this.state = 'IDLE';
            }
        }
    }

     destroy() {
        this.scene.remove(this.mesh);
    }
}