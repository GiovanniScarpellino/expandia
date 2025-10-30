import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Player } from './babylon/Player.js';
import { World } from './babylon/World.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { ResourceManager } from './managers/ResourceManager.js';
import { BuildingManager } from './managers/BuildingManager.js';
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
        this.resourceManager = null;
        this.buildingManager = null;
        this.camera = null;
        this.cameraOffset = new BABYLON.Vector3(0, 12, -10);
        this.models = {};
        this.highlightLayer = null;
        this.yolkSplatMaterial = null;

        this.projectiles = [];
        this.enemyProjectiles = [];
        this.gameState = 'RUNNING'; // RUNNING, PAUSED, GAMEOVER, LEVELUP
        this.gameMode = 'EXPLORATION'; // EXPLORATION, COMBAT
        this.mousePositionInWorld = BABYLON.Vector3.Zero();

        // Player Resources
        this.wood = 20;
        this.stone = 0;

        this.ui = new UI(this);

        // Combat Arena
        this.arenaCenter = new BABYLON.Vector3(1000, 0, 1000);
        this.playerReturnPosition = null;

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
        const rabbitPromise = BABYLON.SceneLoader.ImportMeshAsync(null, "./src/models/", "Rabbit.glb", this.scene);
        const treePromise = BABYLON.SceneLoader.ImportMeshAsync(null, "./src/models/", "tree.glb", this.scene);
        const rockPromise = BABYLON.SceneLoader.ImportMeshAsync(null, "./src/models/", "rock-small.glb", this.scene);
        const chickPromise = BABYLON.SceneLoader.LoadAssetContainerAsync("./src/models/", "Chicken_Guy.glb", this.scene);
        const npcPromise = BABYLON.SceneLoader.ImportMeshAsync(null, "./src/models/", "character-l.glb", this.scene);

        const [rabbitResult, treeResult, rockResult, chickContainer, npcResult] = await Promise.all([rabbitPromise, treePromise, rockPromise, chickPromise, npcPromise]);

        this.models.player = {
            mesh: rabbitResult.meshes[0],
            animationGroups: rabbitResult.animationGroups
        };
        this.models.player.mesh.setEnabled(false);

        this.models.tree = {
            mesh: treeResult.meshes[0],
            animationGroups: treeResult.animationGroups
        };
        this.models.tree.mesh.setEnabled(false);

        this.models.rock = {
            mesh: rockResult.meshes[0],
            animationGroups: rockResult.animationGroups
        };
        this.models.rock.mesh.setEnabled(false);

        // Store the container for chicks. All assets will be instantiated from this.
        this.models.chick = chickContainer;
        this.models.chick.removeAllFromScene(); // Don't show the template mesh

        this.models.npc = {
            mesh: npcResult.meshes[0],
            animationGroups: npcResult.animationGroups
        };
        this.models.npc.mesh.setEnabled(false);
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

        // Create a large, invisible ground plane for mouse picking in the main world
        const ground = BABYLON.MeshBuilder.CreateGround("mouseGround", { width: 1000, height: 1000 }, this.scene);
        ground.material = new BABYLON.StandardMaterial("groundMat", this.scene);
        ground.material.alpha = 0; // Make it invisible
        ground.checkCollisions = false;
        ground.isPickable = true;

        this.world = new World(this, this.scene);

        // Create the combat arena using the world tile system
        const arenaRadius = 4; // Creates a 9x9 area
        const arenaTileOffset = { x: 500, z: 500 }; // Use a large offset for tile coordinates
        for (let x = -arenaRadius - 1; x <= arenaRadius + 1; x++) {
            for (let z = -arenaRadius - 1; z <= arenaRadius + 1; z++) {
                const isUnlocked = Math.abs(x) <= arenaRadius && Math.abs(z) <= arenaRadius;
                const tile = this.world.createTile(arenaTileOffset.x + x, arenaTileOffset.z + z, isUnlocked);
                // Make arena floor pickable for player rotation
                if(isUnlocked) {
                    tile.name = "arenaGround";
                }
            }
        }
        // Adjust arena center to world coordinates for teleportation
        this.arenaCenter = new BABYLON.Vector3(arenaTileOffset.x * this.world.tileSize, 0, arenaTileOffset.z * this.world.tileSize);

        this.world.init();

        this.resourceManager = new ResourceManager(this);
        const resourceData = [
            { type: 'tree', x: 8, z: 8 },
            { type: 'tree', x: -8, z: 8 },
            { type: 'rock', x: 8, z: -8 },
            { type: 'rock', x: -8, z: -8 },
        ];
        this.resourceManager.initialize(resourceData);

        this.enemyManager = new EnemyManager(this);
        this.buildingManager = new BuildingManager(this);

        const playerMesh = this.models.player.mesh.clone("player");
        playerMesh.setEnabled(true);
        playerMesh.getChildMeshes().forEach(m => shadowGenerator.addShadowCaster(m, true));

        this.player = new Player(this, playerMesh, this.scene, this.models.player.animationGroups);
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
        this.ui.updateResources(this.wood, this.stone);

        this.camera.setTarget(this.player.hitbox.position);

        // Post-processing
        /*
        const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, this.scene, [this.camera]);
        pipeline.samples = 4;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.8;
        pipeline.bloomWeight = 0.3;
        pipeline.fxaaEnabled = true;
        */
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
                    const pickResultMove = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "mouseGround" || mesh.name === "arenaGround");
                    if (pickResultMove.hit) {
                        this.mousePositionInWorld = pickResultMove.pickedPoint;
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
            if (e.key === 'c') {
                const spawnPosition = this.player.hitbox.position.clone();
                const backward = this.player.hitbox.getDirection(new BABYLON.Vector3(0, 0, -1));
                spawnPosition.addInPlace(backward.scale(2));
                this.buildingManager.createChick('lumberjackChick', spawnPosition);
                const chick = this.buildingManager.chicks[this.buildingManager.chicks.length - 1];
                if (chick) {
                    this.ui.populateAnimationSelect(Object.keys(chick.animations));
                }
            }
            if (e.key === 'p') {
                this.startCombat();
            }

            // Debug controls
            const chick = this.buildingManager.chicks[this.buildingManager.chicks.length - 1];
            if (chick) {
                if (e.key === 'ArrowLeft') {
                    chick.hitbox.rotation.y -= 0.1;
                    console.log(`Chick hitbox rotation y: ${chick.hitbox.rotation.y}`);
                }
                if (e.key === 'ArrowRight') {
                    chick.hitbox.rotation.y += 0.1;
                    console.log(`Chick hitbox rotation y: ${chick.hitbox.rotation.y}`);
                }
            }
        });
    }

    startCombat() {
        if (this.gameMode === 'COMBAT') return;
        console.log("Starting combat...");

        // Save player's current position and teleport to arena
        this.playerReturnPosition = this.player.hitbox.position.clone();
        this.player.hitbox.position = this.arenaCenter.add(new BABYLON.Vector3(0, 0.5, 0));

        this.gameMode = 'COMBAT';
        this.enemyManager.start(this.arenaCenter);
        this.ui.updateWaveStats(this.enemyManager.waveNumber, 0);
    }

    endCombat() {
        if (this.gameMode !== 'COMBAT') return;
        console.log("Ending combat...");

        // Teleport player back to their original position
        if (this.playerReturnPosition) {
            this.player.hitbox.position = this.playerReturnPosition;
        }
        this.playerReturnPosition = null;

        this.gameMode = 'EXPLORATION';
        // Clean up any remaining enemies, etc.
        this.enemyManager.stop();
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

    addResource(type, amount) {
        if (type === 'tree') {
            this.wood += amount;
        }
        else if (type === 'rock') {
            this.stone += amount;
        }
        this.ui.updateResources(this.wood, this.stone);
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

                if (this.gameMode === 'COMBAT') {
                    this.enemyManager.update(delta);
                }
                this.resourceManager.update(delta);

                for (let i = this.projectiles.length - 1; i >= 0; i--) {
                    this.projectiles[i].update(delta);
                }

                for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
                    this.enemyProjectiles[i].update(delta);
                }

                this.buildingManager.chicks.forEach(chick => {
                    chick.update(delta);
                });
            }
            
            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
}
