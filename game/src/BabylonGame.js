import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Player } from './babylon/Player.js';
import { World } from './babylon/World.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { UI } from './UI.js';

// Collision Groups
export const COLLISION_GROUPS = {
    TERRAIN: 1,
    PLAYER: 2,
    NPC: 4, // Re-using for enemies
    WALL: 8,
    PROJECTILE: 16,
    GROUND: 32, // For mouse picking
};

export class BabylonGame {
    constructor() {
        this.canvas = this.createCanvas();
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = null;
        this.player = null;
        this.world = null;
        this.enemyManager = null;
        this.camera = null;
        this.cameraOffset = new BABYLON.Vector3(0, 12, -10);
        this.models = {};
        this.highlightLayer = null;
        this.yolkSplatMaterial = null;

        this.projectiles = [];
        this.enemyProjectiles = [];
        this.gameState = 'RUNNING'; // RUNNING, PAUSED, GAMEOVER, LEVELUP
        this.mousePositionInWorld = BABYLON.Vector3.Zero();

        this.ui = new UI(this);

        // Upgrade Pool
        this.upgradePool = [
            {
                name: "Vitalité +",
                description: "Augmente les points de vie maximum de 20.",
                apply: (player) => {
                    player.maxHealth += 20;
                    player.health += 20;
                }
            },
            {
                name: "Cadence de Tir +",
                description: "Augmente la vitesse d'attaque de 15%.",
                apply: (player) => { player.attackSpeed *= 0.85; }
            },
            {
                name: "Balles Rapides",
                description: "Augmente la vitesse des projectiles de 25%.",
                apply: (player) => { player.projectileSpeedModifier = (player.projectileSpeedModifier || 1) * 1.25; }
            },
        ];
    }

    async initialize() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.collisionsEnabled = true;
        this.scene.gravity = new BABYLON.Vector3(0, -0.98, 0); // Enable gravity for the scene
        await this.loadModels();
        this.createScene();
        this.setupCameraControls();
        this.setupInputListeners();
    }

    createCanvas() {
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        canvas.tabIndex = 1;
        document.body.appendChild(canvas);
        return canvas;
    }

    async loadModels() {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(null, "./src/models/", "Rabbit.glb", this.scene);
        this.models.player = {
            mesh: result.meshes[0],
            animationGroups: result.animationGroups
        };
        this.models.player.mesh.setEnabled(false);
    }

    createYolkSplatMaterial() {
        if (this.yolkSplatMaterial) return this.yolkSplatMaterial;

        const textureSize = 256;
        const texture = new BABYLON.DynamicTexture("yolkTexture", textureSize, this.scene, true);
        const ctx = texture.getContext();

        // Draw a yellow circle with a bit of an orange outline
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0, 0, textureSize, textureSize);

        const centerX = textureSize / 2;
        const centerY = textureSize / 2;
        const radius = textureSize / 2 - 10;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#FFC300'; // Yolk yellow
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FF5733'; // Orange-red outline
        ctx.stroke();

        texture.update();

        const material = new BABYLON.StandardMaterial("yolkSplatMat", this.scene);
        material.diffuseTexture = texture;
        material.diffuseTexture.hasAlpha = true;
        material.useAlphaFromDiffuseTexture = true;
        material.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0.1);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.backFaceCulling = false;

        this.yolkSplatMaterial = material;
        return material;
    }

    createScene() {
        this.scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.3, 1);
        this.createYolkSplatMaterial(); // Pre-create the material

        this.highlightLayer = new BABYLON.HighlightLayer("hl1", this.scene);
        this.camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 10, -10), this.scene);
        this.camera.inputs.clear();

        const light = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.8, -0.7, -0.9), this.scene);
        light.position = new BABYLON.Vector3(20, 40, 20);
        light.intensity = 1.2;

        const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        hemiLight.intensity = 0.7;
        hemiLight.groundColor = new BABYLON.Color3(0.6, 0.6, 0.8);

        const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 64;
        shadowGenerator.darkness = 0.3;

        // Create a large, invisible ground plane for mouse picking
        const ground = BABYLON.MeshBuilder.CreateGround("mouseGround", { width: 1000, height: 1000 }, this.scene);
        ground.material = new BABYLON.StandardMaterial("groundMat", this.scene);
        ground.material.alpha = 0; // Make it invisible
        ground.checkCollisions = false; // Player should not collide with it
        ground.collisionGroup = COLLISION_GROUPS.GROUND;
        ground.isPickable = true;

        this.world = new World(this, this.scene);
        this.enemyManager = new EnemyManager(this);
        this.world.init();

        const playerMesh = this.models.player.mesh.clone("player");
        playerMesh.setEnabled(true);
        playerMesh.getChildMeshes().forEach(m => shadowGenerator.addShadowCaster(m, true));

        this.player = new Player(this, playerMesh, this.scene, this.models.player.animationGroups);
        this.ui.updateHealth(this.player.health, this.player.maxHealth);

        this.camera.setTarget(this.player.hitbox.position);

        // Post-processing
        const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, this.scene, [this.camera]);
        pipeline.samples = 4;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.8;
        pipeline.bloomWeight = 0.3;
        pipeline.fxaaEnabled = true;
    }

    setupCameraControls() {
        window.addEventListener('wheel', (e) => {
            const zoomSpeed = 0.3;
            let newY = this.cameraOffset.y + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
            let newZ = this.cameraOffset.z - (e.deltaY > 0 ? zoomSpeed * 0.75 : -zoomSpeed * 0.75);
            this.cameraOffset.y = Math.max(6, Math.min(25, newY));
            this.cameraOffset.z = Math.min(-5, Math.max(-20, newZ));
        }, { passive: true });
    }

    setupInputListeners() {
        // Mouse input
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (this.gameState !== 'RUNNING') return;
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.collisionGroup === COLLISION_GROUPS.GROUND);
                    if (pickResult.hit) {
                        this.mousePositionInWorld = pickResult.pickedPoint;
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (this.player) {
                        this.player.attack();
                    }
                    break;
            }
        });

        // Keyboard input
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.togglePause();
            }
        });
    }

    togglePause() {
        if (this.gameState === 'GAMEOVER' || this.gameState === 'LEVELUP') return;

        if (this.gameState === 'RUNNING') {
            this.gameState = 'PAUSED';
            this.ui.togglePauseScreen(true);
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'RUNNING';
            this.ui.togglePauseScreen(false);
        }
    }

    startLevelUp() {
        this.gameState = 'LEVELUP';
        
        // Get 3 unique random upgrades
        const availableUpgrades = [...this.upgradePool];
        const chosenUpgrades = [];
        for (let i = 0; i < 3 && availableUpgrades.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
            chosenUpgrades.push(availableUpgrades.splice(randomIndex, 1)[0]);
        }

        this.ui.showLevelUpScreen(chosenUpgrades);
    }

    applyUpgradeAndResume(upgrade) {
        upgrade.apply(this.player);
        this.ui.hideLevelUpScreen();
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
        this.gameState = 'RUNNING';
    }

    addShadowCaster(mesh) {
        this.scene.lights.forEach(light => {
            if (light.getShadowGenerator()) {
                light.getShadowGenerator().addShadowCaster(mesh, true);
            }
        });
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    removeProjectile(projectile) {
        const index = this.projectiles.indexOf(projectile);
        if (index > -1) {
            this.projectiles.splice(index, 1);
        }
    }

    addEnemyProjectile(projectile) {
        this.enemyProjectiles.push(projectile);
    }

    removeEnemyProjectile(projectile) {
        const index = this.enemyProjectiles.indexOf(projectile);
        if (index > -1) {
            this.enemyProjectiles.splice(index, 1);
        }
    }

    gameOver() {
        if (this.gameState === 'GAMEOVER') return;
        this.gameState = 'GAMEOVER';
        this.ui.showGameOverScreen();
        console.log("Game Over!");
    }

    start() {
        if (!this.scene) {
            console.error("Scene not initialized!");
            return;
        }

        this.enemyManager.start();

        this.engine.runRenderLoop(() => {
            if (this.gameState === 'RUNNING') {
                const delta = this.engine.getDeltaTime() / 1000;

                if (this.player) {
                    this.player.update(delta);
                    this.camera.position = this.player.hitbox.position.add(this.cameraOffset);
                    this.camera.setTarget(this.player.hitbox.position);

                    if (this.player.hitbox.position.y < -10) {
                        this.gameOver();
                    }
                }

                this.enemyManager.update(delta);

                for (let i = this.projectiles.length - 1; i >= 0; i--) {
                    this.projectiles[i].update(delta);
                }

                for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
                    this.enemyProjectiles[i].update(delta);
                }
            }
            
            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
}
