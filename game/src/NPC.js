import * as THREE from 'three';

export class NPC {
    constructor(scene, position, model) {
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

        this.mesh.userData = { state: 'IDLE', target: null };
        this.scene.add(this.mesh);
        this.speed = 0.05;
    }

    update(resources, game) {
        const now = Date.now();
        if (this.mesh.userData.state === 'IDLE') {
            let closestResource = null;
            let minDistance = Infinity;
            resources.forEach(resource => {
                if (resource.mesh.parent && !resource.mesh.userData.targeted) {
                    const distance = this.mesh.position.distanceTo(resource.mesh.position);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestResource = resource;
                    }
                }
            });

            if (closestResource) {
                this.mesh.userData.target = closestResource;
                closestResource.mesh.userData.targeted = true;
                this.mesh.userData.state = 'MOVING_TO_RESOURCE';
            }
        } else if (this.mesh.userData.state === 'MOVING_TO_RESOURCE') {
            const target = this.mesh.userData.target;
            if (target && target.mesh.parent) {
                const direction = new THREE.Vector3().subVectors(target.mesh.position, this.mesh.position).normalize();
                this.mesh.position.add(direction.multiplyScalar(this.speed));

                if (this.mesh.position.distanceTo(target.mesh.position) < 0.5) {
                    this.mesh.userData.state = 'HARVESTING';
                    this.mesh.userData.harvestingStartTime = now;
                }
            } else {
                this.mesh.userData.state = 'IDLE';
            }
        } else if (this.mesh.userData.state === 'HARVESTING') {
            if (now - this.mesh.userData.harvestingStartTime > 2000) { // 2 seconds to harvest
                const target = this.mesh.userData.target;
                if (target && target.mesh.parent) {
                    const resourceType = game.resourceManager.harvestResource(target, this);
                    if(resourceType){
                        game.addResource(resourceType, 1);
                    }
                }
                this.mesh.userData.state = 'IDLE';
            }
        }
    }
     destroy() {
        this.scene.remove(this.mesh);
    }
}
