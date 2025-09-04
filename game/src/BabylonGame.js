
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Player } from './babylon/Player.js';
import { World } from './babylon/World.js';
import { ResourceManager } from './babylon/ResourceManager.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { BuildingManager } from './managers/BuildingManager.js';
import { UI } from './UI.js';
import { CycleManager } from './babylon/CycleManager.js';

export class BabylonGame {
    constructor() {
        this.canvas = this.createCanvas();
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = null;
        this.player = null;
        this.world = null;
        this.resourceManager = null;
        this.enemyManager = null;
        this.buildingManager = null;
        this.camera = null;
        this.cameraOffset = new BABYLON.Vector3(0, 4, -3);
        this.models = {};
        this.base = null;
        this.highlightLayer = null;
        this.cycleManager = null;
        this.hemisphericLight = null;
        this.mainShadowGenerator = null;

        // Inventory
        this.wood = 10; // Start with some wood
        this.stone = 0;

        this.ui = new UI();
        this.ui.updateWood(this.wood);
        this.ui.updateStone(this.stone);
    }

    async initialize() {
        this.scene = new BABYLON.Scene(this.engine);
        await this.loadModels();
        this.createScene();
    }

    createCanvas() {
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);
        return canvas;
    }

    async loadModels() {
        const modelUrls = {
            player: "character-a.glb",
            tree: "tree.glb",
            rock: "rock-small.glb",
            base: "blade.glb"
        };

        for (const key in modelUrls) {
            const result = await BABYLON.SceneLoader.ImportMeshAsync(null, "/src/models/", modelUrls[key], this.scene);
            const rootMesh = result.meshes[0];

            rootMesh.getChildMeshes(false).forEach(mesh => {
                if (mesh.material) {
                    mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
                }
            });

            rootMesh.setEnabled(false);
            this.models[key] = {
                mesh: rootMesh,
                animationGroups: result.animationGroups
            };
        }
    }

    createScene() {
        this.highlightLayer = new BABYLON.HighlightLayer("hl1", this.scene);
        this.camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 10, -10), this.scene);

        const light = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, -0.5), this.scene);
        light.position = new BABYLON.Vector3(20, 40, 20);

        this.hemisphericLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.hemisphericLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);

        this.cycleManager = new CycleManager(this.scene, this.ui, light, this.hemisphericLight);

        this.mainShadowGenerator = new BABYLON.ShadowGenerator(2048, light);
        this.mainShadowGenerator.useBlurExponentialShadowMap = true;
        this.mainShadowGenerator.blurKernel = 64;
        this.mainShadowGenerator.darkness = 0.5;

        this.world = new World(this, this.scene);
        this.resourceManager = new ResourceManager(this, this.scene);
        this.enemyManager = new EnemyManager(this);
        this.buildingManager = new BuildingManager(this);
        
        this.world.init();

        // Connect UI to managers
        this.ui.onCraft = (itemType) => this.buildingManager.enterBuildMode(itemType);

        // Connect managers to game cycles
        this.cycleManager.onNightStart = (day) => this.enemyManager.startWave(day);
        this.cycleManager.onDayStart = () => this.enemyManager.despawnAll();
        this.cycleManager.setLampposts(this.world.lampposts);

        // Create initial resources
        this.resourceManager.createResource('tree', new BABYLON.Vector3(2, 0, 2));
        this.resourceManager.createResource('rock', new BABYLON.Vector3(-2, 0, 2));

        // Add the base
        const baseMesh = this.models.base.mesh.clone("base");
        baseMesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
        baseMesh.position = new BABYLON.Vector3(0, 0, -2);
        baseMesh.rotation.y = Math.PI / 2;
        baseMesh.setEnabled(true);
        this.base = baseMesh;
        this.addShadowCaster(this.base);
        this.base.getChildMeshes().forEach(m => m.receiveShadows = true);

        this.base.metadata = {
            health: 1000,
            maxHealth: 1000,
            takeDamage: (amount) => {
                this.base.metadata.health -= amount;
                this.ui.updateBaseHealth(this.base.metadata.health, this.base.metadata.maxHealth);
                if (this.base.metadata.health <= 0) {
                    this.base.metadata.health = 0;
                    console.error("GAME OVER - La base a été détruite !");
                }
            }
        };
        this.ui.updateBaseHealth(this.base.metadata.health, this.base.metadata.maxHealth);

        const playerMesh = this.models.player.mesh;
        playerMesh.name = "player";
        playerMesh.setEnabled(true);
        this.addShadowCaster(playerMesh);
        
        const animationGroups = this.models.player.animationGroups;
        this.player = new Player(this, playerMesh, this.scene, animationGroups);

        this.camera.setTarget(this.player.mesh.position);
    }

    addShadowCaster(mesh) {
        this.mainShadowGenerator.addShadowCaster(mesh, true);
    }

    addResource(type, amount) {
        if (type === 'tree') {
            this.wood += amount;
            this.ui.updateWood(this.wood);
        } else if (type === 'rock') {
            this.stone += amount;
            this.ui.updateStone(this.stone);
        }
    }

    getClosestResource(maxDist) {
        let closestResource = null;
        let minDistance = Infinity;
        this.resourceManager.resources.forEach(resource => {
            if (!resource.mesh.isEnabled()) return;
            const distance = BABYLON.Vector3.Distance(this.player.mesh.position, resource.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestResource = resource;
            }
        });
        return minDistance < maxDist ? closestResource : null;
    }

    getClosestUnlockableTile(maxDist) {
        let tileToUnlock = null;
        let minDistance = Infinity;
        for (const key in this.world.tiles) {
            const tile = this.world.tiles[key];
            if (!tile.metadata.unlocked) {
                const distance = BABYLON.Vector3.Distance(this.player.mesh.position, tile.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    tileToUnlock = tile;
                }
            }
        }
        return minDistance < maxDist ? tileToUnlock : null;
    }

    doContextualAction() {
        const resourceToHarvest = this.getClosestResource(0.5);
        if (resourceToHarvest) {
            this.player.playerHarvest(() => {
                const resourceType = this.resourceManager.harvestResource(resourceToHarvest);
                if (resourceType) {
                    this.addResource(resourceType, 1);
                }
            });
            return;
        }

        const tileToUnlock = this.getClosestUnlockableTile(1.2);
        if (tileToUnlock) {
            const unlockCost = 1;
            if (this.wood >= unlockCost) {
                this.wood -= unlockCost;
                this.ui.updateWood(this.wood);
                this.world.unlockTile(tileToUnlock);
            } else {
                console.log("Not enough wood to unlock tile!");
            }
        }
    }

    updateInteractionHighlights() {
        this.highlightLayer.removeAllMeshes();

        const resourceToHarvest = this.getClosestResource(0.5);
        if (resourceToHarvest) {
            resourceToHarvest.mesh.getChildMeshes().forEach(m => {
                this.highlightLayer.addMesh(m, BABYLON.Color3.Green());
            });
            return;
        }

        const tileToUnlock = this.getClosestUnlockableTile(1.2);
        if (tileToUnlock) {
            this.highlightLayer.addMesh(tileToUnlock, BABYLON.Color3.Yellow());
        }
    }

    start() {
        if (!this.scene) {
            console.error("Scene not initialized!");
            return;
        }

        this.engine.runRenderLoop(() => {
            const delta = this.engine.getDeltaTime() / 1000;

            this.updateInteractionHighlights();
            this.cycleManager.update(delta);

            if (this.player) {
                this.player.update(delta);
                this.camera.position = this.player.mesh.position.add(this.cameraOffset);
                this.camera.setTarget(this.player.mesh.position);
            }
            if (this.resourceManager) {
                this.resourceManager.update();
            }
            if (this.enemyManager) {
                this.enemyManager.update(delta);
            }
            if (this.buildingManager) {
                this.buildingManager.update();
            }
            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
}
