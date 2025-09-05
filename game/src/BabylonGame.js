
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
        this.cameraOffset = new BABYLON.Vector3(0, 10, -8); // Increased offset for better view
        this.models = {};
        this.base = null;
        this.highlightLayer = null;
        this.cycleManager = null;
        this.hemisphericLight = null;
        this.mainShadowGenerator = null;

        this.isPaused = false;
        this.cameraKeys = { z: false, s: false, q: false, d: false };
        this.freeCameraSpeed = 3; // units per second
        this.freeCameraTarget = new BABYLON.Vector3(0, 0, 0);
        this.latestDragMousePosition = { x: 0, y: 0 };

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
        this.setupCameraControls();
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
        this.camera.inputs.clear(); // We will handle camera inputs manually

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
        this.ui.onBuildMenuToggled = (isOpen) => this.buildingManager.toggleBuildMode(isOpen);
        this.ui.onDragStart = (itemType) => this.buildingManager.startPlacement(itemType);

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

        // Setup canvas drop zone
        this.canvas.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.latestDragMousePosition = { x: event.clientX, y: event.clientY };
        });

        this.canvas.addEventListener('drop', (event) => {
            event.preventDefault();
            const itemType = event.dataTransfer.getData('text/plain');
            this.buildingManager.confirmPlacement(itemType);
        });
    }

    setupCameraControls() {
        window.addEventListener('keydown', (e) => {
            if (this.buildingManager.isBuildingMode && e.key in this.cameraKeys) {
                this.cameraKeys[e.key] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.buildingManager.isBuildingMode && e.key in this.cameraKeys) {
                this.cameraKeys[e.key] = false;
            }
        });
        window.addEventListener('wheel', (e) => {
            const zoomSpeed = 0.2; // Reduced zoom speed
            // Adjust the camera offset for zooming
            let newY = this.cameraOffset.y + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
            let newZ = this.cameraOffset.z - (e.deltaY > 0 ? zoomSpeed * 0.75 : -zoomSpeed * 0.75);
            
            // Clamp the zoom levels
            this.cameraOffset.y = Math.max(5, Math.min(25, newY));
            this.cameraOffset.z = Math.min(-4, Math.max(-20, newZ));
        }, { passive: true });
    }

    updateFreeCamera(delta) {
        const moveDirection = new BABYLON.Vector3(0, 0, 0);
        if (this.cameraKeys.z) moveDirection.z += 1;
        if (this.cameraKeys.s) moveDirection.z -= 1;
        if (this.cameraKeys.q) moveDirection.x -= 1;
        if (this.cameraKeys.d) moveDirection.x += 1;

        if (moveDirection.lengthSquared() > 0) {
            moveDirection.normalize();
            const moveVector = moveDirection.scale(this.freeCameraSpeed * delta);
            const newTarget = this.freeCameraTarget.clone().add(moveVector);

            if (this.world.isPositionNearUnlockedTile(newTarget)) {
                this.freeCameraTarget.copyFrom(newTarget);
            }
        }
        
        this.camera.setTarget(this.freeCameraTarget);
        this.camera.position = this.freeCameraTarget.clone().add(this.cameraOffset);
    }

    setPaused(isPaused) {
        this.isPaused = isPaused;
        this.cycleManager.paused = isPaused;
        if (isPaused) {
            this.camera.setTarget(this.player.mesh.position.clone());
        }
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

        document.addEventListener('dragend', (event) => {
            this.buildingManager.cancelPlacement();
        });

        this.engine.runRenderLoop(() => {
            const delta = this.engine.getDeltaTime() / 1000;

            this.updateInteractionHighlights();
            
            if (this.buildingManager.isBuildingMode) {
                this.updateFreeCamera(delta);
            } else {
                if (this.player) {
                    this.camera.position = this.player.mesh.position.add(this.cameraOffset);
                    this.camera.setTarget(this.player.mesh.position);
                }
            }

            if (!this.isPaused) {
                this.cycleManager.update(delta);
                if (this.player) {
                    this.player.update(delta);
                }
                if (this.enemyManager) {
                    this.enemyManager.update(delta);
                }
            }
            
            if (this.resourceManager) {
                this.resourceManager.update();
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
