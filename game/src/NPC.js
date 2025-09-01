import * as THREE from 'three';

export class NPC {
    constructor(scene, position) {
        this.scene = scene;
        const npcGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const npcMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // white
        this.mesh = new THREE.Mesh(npcGeometry, npcMaterial);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
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
