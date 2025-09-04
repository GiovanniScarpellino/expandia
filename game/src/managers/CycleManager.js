import * as THREE from 'three';

export class CycleManager {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui;

        this.dayDuration = 3 * 60 * 1000; // 3 minutes
        this.nightDuration = 2 * 60 * 1000; // 2 minutes

        this.isDay = true;
        this.timeOfDay = this.dayDuration;
        this.daysSurvived = 0;

        this.onNightStart = () => {};
        this.onDayStart = () => {};

        // --- Scene Effects ---
        this.skyColorDay = new THREE.Color(0x87CEEB);
        this.skyColorNight = new THREE.Color(0x000033);
        this.fogColorDay = new THREE.Color(0x87CEEB);
        this.fogColorNight = new THREE.Color(0x000033);
        this.scene.fog = new THREE.Fog(this.skyColorDay, 5, 25);

        // --- Lighting ---
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.scene.add(this.directionalLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        // --- Celestial Bodies ---
        const sunGeo = new THREE.SphereGeometry(1, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        const moonGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xE0E0E0 });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(this.moon);

        this.lampposts = [];
    }

    setLampposts(lampposts) {
        this.lampposts = lampposts;
    }

    update(delta) {
        this.timeOfDay -= delta * 1000;

        let progress;
        if (this.isDay) {
            progress = 1 - (this.timeOfDay / this.dayDuration);
        } else {
            progress = 1 - (this.timeOfDay / this.nightDuration);
        }

        // Update sky, fog, and lights based on progress
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
        const sunAngle = progress * Math.PI; // From 0 to PI (sunrise to sunset)
        const moonAngle = sunAngle + Math.PI; // Opposite side

        // Sun and Moon position
        this.sun.position.set(Math.cos(sunAngle) * 20, Math.sin(sunAngle) * 15, 0);
        this.moon.position.set(Math.cos(moonAngle) * 20, Math.sin(moonAngle) * 15, 0);

        // Main light follows the sun
        this.directionalLight.position.copy(this.sun.position);

        if (this.isDay) {
            this.sun.visible = true;
            this.moon.visible = false;
            this.scene.background = this.skyColorDay;
            this.scene.fog.color.copy(this.fogColorDay);
            this.directionalLight.intensity = 1 + Math.sin(sunAngle) * 0.5; // Brighter mid-day
            this.ambientLight.intensity = 0.4 + Math.sin(sunAngle) * 0.4;
        } else {
            this.sun.visible = false;
            this.moon.visible = true;
            this.scene.background = this.skyColorNight;
            this.scene.fog.color.copy(this.fogColorNight);
            this.directionalLight.intensity = 0; // No directional light at night
            this.ambientLight.intensity = 0.1;
        }
    }
}