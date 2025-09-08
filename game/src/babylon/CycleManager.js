
import * as BABYLON from '@babylonjs/core';

export class CycleManager {
    constructor(scene, ui, mainLight, hemisphericLight) {
        this.scene = scene;
        this.ui = ui;
        this.mainLight = mainLight; // The main directional light
        this.hemisphericLight = hemisphericLight;

        this.dayDuration = 3 * 60 * 1000; // 3 minutes
        this.nightDuration = 2 * 60 * 1000; // 2 minutes

        this.isDay = true;
        this.timeOfDay = this.dayDuration;
        this.daysSurvived = 0;

        this.onNightStart = () => {};
        this.onDayStart = () => {};

        // --- Scene Effects ---
        this.skyColorDay = new BABYLON.Color4(0.53, 0.81, 0.92, 1); // 0x87CEEB
        this.skyColorNight = new BABYLON.Color4(0.0, 0.0, 0.2, 1);  // 0x000033
        
        this.scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
        this.scene.fogStart = 15.0;
        this.scene.fogEnd = 40.0;

        // --- Celestial Bodies ---
        const sunMat = new BABYLON.StandardMaterial("sunMat", scene);
        sunMat.emissiveColor = new BABYLON.Color3(1, 1, 0); // 0xFFFF00
        this.sun = BABYLON.MeshBuilder.CreateSphere("sun", { diameter: 2 }, scene);
        this.sun.material = sunMat;

        const moonMat = new BABYLON.StandardMaterial("moonMat", scene);
        moonMat.emissiveColor = new BABYLON.Color3(0.88, 0.88, 0.88); // 0xE0E0E0
        this.moon = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: 1 }, scene);
        this.moon.material = moonMat;

        this.lampposts = [];
        this.paused = false;
    }

    setLampposts(lampposts) {
        this.lampposts = lampposts;
    }

    startNight() {
        if (this.isDay) {
            this.timeOfDay = 0;
        }
    }

    update(delta) {
        if (this.paused) {
            // If paused, we still need to update the UI, but not advance time
            this.ui.updateCycle(this.isDay, this.timeOfDay, this.daysSurvived);
            return;
        }

        this.timeOfDay -= delta * 1000;

        let progress;
        if (this.isDay) {
            progress = 1 - (this.timeOfDay / this.dayDuration);
        } else {
            progress = 1 - (this.timeOfDay / this.nightDuration);
        }

        this.updateAtmosphere(progress);

        if (this.timeOfDay <= 0) {
            if (this.isDay) {
                this.isDay = false;
                this.timeOfDay = this.nightDuration;
                this.lampposts.forEach(l => l.turnOn());
                this.onNightStart(this.daysSurvived + 1);
            } else {
                this.isDay = true;
                this.timeOfDay = this.dayDuration;
                this.daysSurvived++;
                this.lampposts.forEach(l => l.turnOff());
                this.onDayStart();
            }
        }
        this.ui.updateCycle(this.isDay, this.timeOfDay, this.daysSurvived);
    }

    updateAtmosphere(progress) {
        const sunAngle = progress * Math.PI;
        const moonAngle = sunAngle + Math.PI;

        this.sun.position.set(Math.cos(sunAngle) * 30, Math.sin(sunAngle) * 20, 0);
        this.moon.position.set(Math.cos(moonAngle) * 30, Math.sin(moonAngle) * 20, 0);

        this.mainLight.direction = this.sun.position.scale(-1).normalize();

        if (this.isDay) {
            this.sun.setEnabled(true);
            this.moon.setEnabled(false);
            const sunInfluence = Math.sin(sunAngle);

            this.scene.clearColor = BABYLON.Color4.Lerp(this.skyColorNight, this.skyColorDay, sunInfluence);
            this.scene.fogColor = new BABYLON.Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b);
            this.hemisphericLight.intensity = BABYLON.Scalar.Lerp(0.2, 1.0, sunInfluence);
            this.mainLight.intensity = BABYLON.Scalar.Lerp(0.1, 1.0, sunInfluence);
        } else {
            this.sun.setEnabled(false);
            this.moon.setEnabled(true);
            
            this.scene.clearColor = this.skyColorNight;
            this.scene.fogColor = new BABYLON.Color3(0,0,0.2);
            this.hemisphericLight.intensity = 0.2;
            this.mainLight.intensity = 0.1; // A little bit of light at night
        }
    }
}
