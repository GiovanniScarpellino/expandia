
import * as BABYLON from '@babylonjs/core';

export class Lamppost {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;

        // Create a simple pole
        const pole = BABYLON.MeshBuilder.CreateCylinder("pole", { height: 1.5, diameter: 0.1 }, scene);
        pole.position = this.position.clone();
        pole.position.y += 0.75;
        const poleMat = new BABYLON.StandardMaterial("poleMat", scene);
        poleMat.diffuseColor = new BABYLON.Color3(0.31, 0.31, 0.31); // 0x505050
        poleMat.specularColor = new BABYLON.Color3(0, 0, 0);
        pole.material = poleMat;

        // Create the light source
        this.light = new BABYLON.PointLight("lamppostlight", this.position.clone().add(new BABYLON.Vector3(0, 1.6, 0)), scene);
        this.light.diffuse = new BABYLON.Color3(1, 0.84, 0); // 0xFFD700
        this.light.intensity = 0;
        this.light.range = 10;

        // Optional: add a small sphere to represent the bulb
        this.bulb = BABYLON.MeshBuilder.CreateSphere("bulb", { diameter: 0.2 }, scene);
        this.bulb.position = this.light.position.clone();
        const bulbMat = new BABYLON.StandardMaterial("bulbMat", scene);
        bulbMat.emissiveColor = new BABYLON.Color3(1, 0.84, 0); // 0xFFD700
        this.bulb.material = bulbMat;
        this.bulb.setEnabled(false);
    }

    turnOn() {
        this.light.intensity = 2.0;
        this.bulb.setEnabled(true);
    }

    turnOff() {
        this.light.intensity = 0;
        this.bulb.setEnabled(false);
    }
}
