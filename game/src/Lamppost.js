import * as THREE from 'three';

export class Lamppost {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;

        // Create a simple pole
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x505050 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.copy(this.position);
        pole.position.y += 0.75;
        this.scene.add(pole);

        // Create the light source
        this.light = new THREE.PointLight(0xFFD700, 0, 10, 1); // (color, intensity, distance, decay)
        this.light.position.set(this.position.x, this.position.y + 1.6, this.position.z);
        this.light.castShadow = true;
        this.scene.add(this.light);

        // Optional: add a small sphere to represent the bulb
        const bulbGeo = new THREE.SphereGeometry(0.1, 16, 16);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        this.bulb = new THREE.Mesh(bulbGeo, bulbMat);
        this.bulb.position.copy(this.light.position);
        this.bulb.visible = false;
        this.scene.add(this.bulb);
    }

    turnOn() {
        this.light.intensity = 2.0; // A bright intensity
        this.bulb.visible = true;
    }

    turnOff() {
        this.light.intensity = 0;
        this.bulb.visible = false;
    }
}
