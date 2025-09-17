import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Player } from './babylon/Player.js';
import { World } from './babylon/World.js';
import { ResourceManager } from './babylon/ResourceManager.js';
import { BuildingManager } from './managers/BuildingManager.js';
import { UI } from './UI.js';
import { CycleManager } from './babylon/CycleManager.js';
import { NPC } from './babylon/NPC.js';

export class BabylonGame {
    constructor() {
        this.canvas = this.createCanvas();
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = null;
        this.player = null;
        this.world = null;
        this.resourceManager = null;
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

        // Inventory
        this.wood = 10; // Start with some wood
        this.stone = 10; // Start with some stone for NPC

        // NPCs
        this.npcs = [];
        this.npcCost = { wood: 10, stone: 10 };

        this.ui = new UI(this);
        this.ui.updateWood(this.wood);
        this.ui.updateStone(this.stone);

        // Define handlers in constructor to preserve `this` context
        this.handleNightStart = (day) => {
            console.log("BabylonGame: handleNightStart triggered for day", day);
        };

        this.handleDayStart = () => {
            
        };

        // Ensure 'this' context for methods passed as callbacks
        this.doContextualAction = this.doContextualAction.bind(this);
    }

    async initialize() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.collisionsEnabled = true;
        await this.loadModels();
        this.createScene();
        this.setupCameraControls();
    }

    createCanvas() {
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        canvas.tabIndex = 1; // Make canvas focusable
        document.body.appendChild(canvas);
        return canvas;
    }

    async loadModels() {
        const modelUrls = {
            player: "character-a.glb",
            npc: "character-l.glb",
            tree: "tree.glb",
            rock: "rock-small.glb",
            base: "blade.glb",
            spawner: "blade.glb",
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

        // Create a large ground plane for visual effect
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
        const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.4, 0.3); // Brownish color
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        ground.material = groundMaterial;
        ground.receiveShadows = true;
        ground.position.y = -0.05; // Position it slightly below the tiles

        this.world = new World(this, this.scene);
        this.resourceManager = new ResourceManager(this, this.scene);
        this.buildingManager = new BuildingManager(this);
        
        this.world.init();

        // Connect UI to managers
        this.ui.onBuildMenuToggled = (isOpen) => this.buildingManager.toggleBuildMode(isOpen);
        this.ui.onItemSelected = (itemType) => this.buildingManager.selectItemToPlace(itemType);

        // Connect managers to game cycles
        this.cycleManager.onNightStart = this.handleNightStart;
        this.cycleManager.onDayStart = this.handleDayStart;
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

        this.camera.setTarget(this.player.hitbox.position);

        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (this.buildingManager.isPlacing) {
                        this.buildingManager.confirmPlacement();
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    if (this.buildingManager.isPlacing) {
                        this.buildingManager.updateGhostMeshPosition();
                    }
                    break;
            }
        });
    }

    setupCameraControls() {
        this.canvas.addEventListener('keydown', (e) => {
            if (this.buildingManager.isPlacing) {
                this.buildingManager.handlePlacementKeyPress(e);
                return; // Prevent other keydowns while placing
            }

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
            this.camera.setTarget(this.player.hitbox.position.clone());
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
            const distance = BABYLON.Vector3.Distance(this.player.hitbox.position, resource.mesh.position);
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
                const distance = BABYLON.Vector3.Distance(this.player.hitbox.position, tile.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    tileToUnlock = tile;
                }
            }
        }
        return minDistance < maxDist ? tileToUnlock : null;
    }

    doContextualAction() {
        // NPC Creation at base
        if (this.base && BABYLON.Vector3.Distance(this.player.hitbox.position, this.base.position) < 2.0) {
            if (this.wood >= this.npcCost.wood && this.stone >= this.npcCost.stone) {
                this.wood -= this.npcCost.wood;
                this.stone -= this.npcCost.stone;
                this.ui.updateWood(this.wood);
                this.ui.updateStone(this.stone);

                const npc = new NPC(this, this.base.position.clone(), this.models.npc.animationGroups);
                this.npcs.push(npc);
                this.ui.updateNpcCount(this.npcs.length);

                console.log("Created a new NPC!");
                return; // Action taken
            }
        }

        const resourceToHarvest = this.getClosestResource(1.0);
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

        const resourceToHarvest = this.getClosestResource(1.0);
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

        // Highlight base for NPC creation
        if (this.base && BABYLON.Vector3.Distance(this.player.hitbox.position, this.base.position) < 2.0) {
            if (this.wood >= this.npcCost.wood && this.stone >= this.npcCost.stone) {
                this.base.getChildMeshes().forEach(m => {
                    this.highlightLayer.addMesh(m, BABYLON.Color3.Yellow());
                });
            }
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
            
            if (this.buildingManager.isBuildingMode) {
                this.updateFreeCamera(delta);
            } else {
                if (this.player) {
                    this.camera.position = this.player.hitbox.position.add(this.cameraOffset);
                    this.camera.setTarget(this.player.hitbox.position);
                }
            }

            if (!this.isPaused) {
                this.cycleManager.update(delta);
                if (this.player) {
                    this.player.update(delta);
                }
                this.npcs.forEach(npc => npc.update(delta));
            }
            
            if (this.resourceManager) {
                this.resourceManager.update();
            }

            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
}
