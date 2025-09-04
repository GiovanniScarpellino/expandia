import * as THREE from 'three';
import { UI } from './UI.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { Wall } from './Wall.js';
import { ResourceManager } from './managers/ResourceManager.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { NPCManager } from './managers/NPCManager.js';
import { InputHandler } from './InputHandler.js';
import { QuestManager } from './managers/QuestManager.js';
import { TouchHandler } from './TouchHandler.js';
import { GameStateManager } from './managers/GameStateManager.js';
import { CycleManager } from './managers/CycleManager.js';
import { Lamppost } from './Lamppost.js';

export class Game {
    constructor(models) {
        this.models = models;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x262626);

        this.clock = new THREE.Clock();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraOffset = new THREE.Vector3(0, 2, 2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement)

        this.wood = 0;
        this.stone = 0;
        this.walls = [];
        this.placementMode = null;

        this.ui = new UI();
        this.ui.onCraft = (itemName) => this.craftItem(itemName);

        this.gameStateManager = new GameStateManager();
        this.cycleManager = new CycleManager(this.scene, this.ui);
        this.lampposts = [];

        this.questManager = new QuestManager(this.ui, this);

        const resourceModels = {
            tree: this.models.trees,
            rock: this.models.rocks
        };
        this.resourceManager = new ResourceManager(this.scene, resourceModels);
        this.enemyManager = new EnemyManager(this.scene, this.models.enemy, this.questManager);
        
        this.world = new World(this.scene);
        this.player = new Player(this.scene, (pos) => this.world.canMoveTo(pos), this.models.player);
        this.inputHandler = new InputHandler(this);
        this.touchHandler = new TouchHandler(this);

        // --- GHOST --- 
        const ghostGeometry = new THREE.BoxGeometry(this.world.tileSize, 1, 0.1);
        this.ghostMaterialValid = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        this.ghostMaterialInvalid = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
        this.ghostWall = new THREE.Mesh(ghostGeometry, this.ghostMaterialValid);
        this.ghostWall.visible = false;
        this.ghostWall.userData.edgeIndex = 0; // 0: front, 1: right, 2: back, 3: left
        this.scene.add(this.ghostWall);

        this.isAutoMode = false;
        const autoModeButton = document.getElementById('auto-mode-button');
        autoModeButton.addEventListener('click', () => {
            this.isAutoMode = !this.isAutoMode;
            autoModeButton.style.backgroundColor = this.isAutoMode ? '#4CAF50' : '';
            autoModeButton.style.color = this.isAutoMode ? 'white' : '';
        });
        
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('wheel', (event) => this.onMouseWheel(event));
    }

    start() {
        if (this.gameStateManager.hasSave()) {
            this.loadState();
        } else {
            this.initNewGame();
        }
        this.animate();
    }

    initSharedComponents() {
        this.base = this.models.base.scene;
        this.base.scale.set(0.5, 0.5, 0.5);
        this.base.position.set(0, this.world.yOffset, -2);
        this.base.rotation.y = Math.PI / 2;
        this.base.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.base.userData = {
            health: 1000,
            maxHealth: 1000,
            takeDamage: (amount) => {
                this.base.userData.health -= amount;
                this.ui.updateBaseHealth(this.base.userData.health, this.base.userData.maxHealth);
                if (this.base.userData.health <= 0) {
                    this.base.userData.health = 0;
                    this.gameOver();
                }
            }
        };
        this.ui.updateBaseHealth(this.base.userData.health, this.base.userData.maxHealth);

        this.scene.add(this.base);

        this.npcManager = new NPCManager(this.scene, this.base.position, this.models.npc);
        this.cycleManager.setLampposts(this.lampposts);

        this.questManager.getNewQuest({ wood: this.wood, stone: this.stone, unlockedTiles: Object.keys(this.world.tiles).length });

        this.cycleManager.onNightStart = (wave) => this.startNight(wave);
        this.cycleManager.onDayStart = () => this.endNight();
    }

    gameOver() {
        console.error("GAME OVER - La base a été détruite !");
        this.clock.stop();
        // TODO: Show a game over screen in the UI
    }

    initNewGame() {
        this.world.init();
        this.resourceManager.createResource('tree', new THREE.Vector3(0.5, this.world.yOffset, 0.5));
        this.resourceManager.createResource('rock', new THREE.Vector3(-0.5, this.world.yOffset, 0.5));
        const startLamp = new Lamppost(this.scene, new THREE.Vector3(0, -0.5, 0));
        this.lampposts.push(startLamp);
        this.initSharedComponents();
    }

    saveState() {
        const state = {
            wood: this.wood,
            stone: this.stone,
            cameraOffset: this.cameraOffset,
            player: {
                position: this.player.mesh.position,
                health: this.player.health
            },
            world: {
                tiles: Object.values(this.world.tiles).map(tile => ({ x: tile.userData.x, z: tile.userData.z, unlocked: tile.userData.unlocked }))
            },
            npcs: {
                count: this.npcManager.npcs.length
            },
            resources: {
                active: this.resourceManager.resources
                    .filter(r => r.mesh.parent === this.scene)
                    .map(r => ({ type: r.type, position: r.mesh.position })),
                respawning: this.resourceManager.respawnQueue.map(item => ({
                    type: item.object.type,
                    position: item.object.position,
                    respawnAt: item.respawnTime
                }))
            },
            cycle: {
                isDay: this.cycleManager.isDay,
                timeOfDay: this.cycleManager.timeOfDay,
                daysSurvived: this.cycleManager.daysSurvived
            },
            lampposts: this.lampposts.map(l => l.position)
        };
        this.gameStateManager.save(state);
        this.ui.showSaveIndicator();
    }

    loadState() {
        const savedState = this.gameStateManager.load();
        if (!savedState) return;

        this.wood = savedState.wood;
        this.stone = savedState.stone;
        this.cameraOffset.copy(savedState.cameraOffset);

        this.player.mesh.position.copy(savedState.player.position);
        this.player.health = savedState.player.health;

        this.world.loadState(savedState.world.tiles);
        this.resourceManager.loadState(savedState.resources);

        if (savedState.lampposts) {
            savedState.lampposts.forEach(pos => {
                const lamp = new Lamppost(this.scene, new THREE.Vector3(pos.x, pos.y, pos.z));
                this.lampposts.push(lamp);
            });
        }

        if (savedState.cycle) {
            this.cycleManager.isDay = savedState.cycle.isDay;
            this.cycleManager.timeOfDay = savedState.cycle.timeOfDay;
            this.cycleManager.daysSurvived = savedState.cycle.daysSurvived;
            if (this.cycleManager.isDay) {
                this.lampposts.forEach(l => l.turnOff());
            } else {
                this.lampposts.forEach(l => l.turnOn());
            }
        }

        this.initSharedComponents();

        const npcCount = savedState.npcs.count;
        for (let i = 0; i < npcCount; i++) {
            this.npcManager.createNPC(true);
        }
        
        this.ui.updateWood(this.wood);
        this.ui.updateStone(this.stone);
        this.ui.updateHealth(this.player.health);
    }

    startNight(wave) {
        console.log(`La nuit ${wave} commence ! Les monstres arrivent !`);

        const unlockedTiles = Object.values(this.world.tiles).filter(t => t.userData.unlocked);
        if (unlockedTiles.length === 0) return;

        const borderTiles = unlockedTiles.filter(tile => {
            const { x, z } = tile.userData;
            const neighbors = [{x: x+1, z}, {x: x-1, z}, {x, z: z+1}, {x, z: z-1}];
            return neighbors.some(n => {
                const key = this.world.getTileKey(n.x, n.z);
                return !this.world.tiles[key] || !this.world.tiles[key].userData.unlocked;
            });
        });

        const spawnTiles = borderTiles.length > 0 ? borderTiles : unlockedTiles;

        const numEnemies = 1 + wave;
        for (let i = 0; i < numEnemies; i++) {
            const randomTile = spawnTiles[Math.floor(Math.random() * spawnTiles.length)];
            const spawnPosition = randomTile.position.clone();
            spawnPosition.y = 0;
            this.enemyManager.createEnemy(spawnPosition);
        }
    }

    endNight() {
        console.log("Le jour se lève. Vous avez survécu !");
    }
    
    addResource(type, amount) {
        if (type === 'tree') {
            this.wood += amount;
            this.ui.updateWood(this.wood);
        } else if (type === 'rock') {
            this.stone += amount;
            this.ui.updateStone(this.stone);
        }
        this.questManager.checkProgress('collect_resource', { type, amount });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseWheel(event) {
        const zoomSpeed = 0.01;
        const minZoomY = 2;
        const maxZoomY = 15;
        const minZoomZ = 2;
        const maxZoomZ = 15;

        this.cameraOffset.y -= event.deltaY * zoomSpeed;
        this.cameraOffset.z -= event.deltaY * zoomSpeed;

        this.cameraOffset.y = Math.max(minZoomY, Math.min(maxZoomY, this.cameraOffset.y));
        this.cameraOffset.z = Math.max(minZoomZ, Math.min(maxZoomZ, this.cameraOffset.z));
    }

    playerAttack() {
        this.player.playAction('attack');

        let closestEnemy = null;
        let minDistance = Infinity;
        this.enemyManager.enemies.forEach(enemy => {
            const distance = this.player.mesh.position.distanceTo(enemy.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });

        if (closestEnemy && minDistance < 1.5) {
            if (closestEnemy.isBroken) {
                closestEnemy.takeDamage(this.player.ruptureAttackDamage);
            } else {
                closestEnemy.takePostureDamage(this.player.postureAttackDamage);
            }
        }
    }

    playerHarvest() {
        let closestResource = this.getClosestResource(1);
        if (closestResource) {
            const action = this.player.playAction('pickup');
            if (action) {
                const animationDuration = action.getClip().duration * 1000;
                setTimeout(() => {
                    const resourceType = this.resourceManager.harvestResource(closestResource, this.player);
                    if (resourceType) {
                        this.addResource(resourceType, 1);
                    }
                }, animationDuration);
            }
        }
    }

    unlockTile() {
        const unlockCost = 1;
        if (this.wood >= unlockCost) {
            let tileToUnlock = this.getClosestUnlockableTile(1.5);
            if (tileToUnlock) {
                this.wood -= unlockCost;
                this.ui.updateWood(this.wood);
                const newTilesInfo = this.world.unlockTile(tileToUnlock);

                const { x, z } = tileToUnlock.userData;
                if (x !== 0 || z !== 0) {
                    if (Math.abs(x) % 3 === 0 && Math.abs(z) % 3 === 0) {
                        const lamp = new Lamppost(this.scene, tileToUnlock.position.clone());
                        this.lampposts.push(lamp);
                        if (!this.cycleManager.isDay) {
                            lamp.turnOn();
                        }
                    }
                }
                
                newTilesInfo.forEach(info => {
                    if (info.isNew) {
                        const coords = info.coords;
                        const tilePos = new THREE.Vector3(coords.x * this.world.tileSize, this.world.yOffset, coords.z * this.world.tileSize);
                        
                        if (Math.random() < 0.2) {
                            const pos = tilePos.clone().add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(this.world.tileSize * 0.8));
                            this.resourceManager.createResource('tree', pos);
                        }
                        if (Math.random() < 0.1) {
                            const pos = tilePos.clone().add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(this.world.tileSize * 0.8));
                            this.resourceManager.createResource('rock', pos);
                        }
                        if (Math.random() < 0.05) {
                            const pos = tilePos.clone().add(new THREE.Vector3(0, 0.3, 0));
                            this.enemyManager.createEnemy(pos);
                        }
                    }
                });

                this.questManager.checkProgress('unlock_tile', 1);
            }
        }
    }

    buyNPC() {
        if (this.player.mesh.position.distanceTo(this.base.position) < 2) {
            if (this.wood >= this.npcManager.npcCost.wood && this.stone >= this.npcManager.npcCost.stone) {
                this.wood -= this.npcManager.npcCost.wood;
                this.stone -= this.npcManager.npcCost.stone;
                this.ui.updateWood(this.wood);
                this.ui.updateStone(this.stone);
                this.npcManager.createNPC();
            }
        }
    }

    craftItem(itemName) {
        if (this.placementMode) return; // Already placing something

        if (itemName === 'wooden_wall') {
            const cost = 5;
            if (this.wood >= cost) {
                this.placementMode = 'wooden_wall';
                this.ghostWall.visible = true;
                this.ui.hideBuildMenu();
            } else {
                console.log('Not enough wood!'); // TODO: Show UI message
            }
        }
    }

    cancelPlacement() {
        this.placementMode = null;
        this.ghostWall.visible = false;
    }

    rotatePlacementGhost() {
        if (!this.placementMode) return;
        this.ghostWall.userData.edgeIndex = (this.ghostWall.userData.edgeIndex + 1) % 4;
    }

    updateGhostWallPosition() {
        // 1. Determine placement direction based on player orientation and user rotation choice
        const edgeIndex = this.ghostWall.userData.edgeIndex;
        
        const playerForward = new THREE.Vector3(0, 0, 1).applyEuler(this.player.mesh.rotation);
        const playerRight = new THREE.Vector3(1, 0, 0).applyEuler(this.player.mesh.rotation);

        let direction;
        switch (edgeIndex) {
            case 0: // Front
                direction = playerForward;
                break;
            case 1: // Right
                direction = playerRight;
                break;
            case 2: // Back
                direction = playerForward.clone().negate();
                break;
            case 3: // Left
                direction = playerRight.clone().negate();
                break;
        }

        // 2. Get tile coordinates
        const playerTileCoords = this.world.getTileCoordinates(this.player.mesh.position);
        const playerTileCenter = new THREE.Vector3(playerTileCoords.x * this.world.tileSize, 0, playerTileCoords.z * this.world.tileSize);

        const targetTileX = playerTileCoords.x + Math.round(direction.x);
        const targetTileZ = playerTileCoords.z + Math.round(direction.z);
        const targetTileCenter = new THREE.Vector3(targetTileX * this.world.tileSize, 0, targetTileZ * this.world.tileSize);

        // 3. Calculate position on the edge between the two tiles
        const edgeCenter = new THREE.Vector3().addVectors(playerTileCenter, targetTileCenter).multiplyScalar(0.5);

        // 4. Set height correctly
        const wallHeight = 1; // From BoxGeometry
        edgeCenter.y = this.world.yOffset + wallHeight / 2;

        this.ghostWall.position.copy(edgeCenter);

        // 5. Align ghost rotation to the edge
        this.ghostWall.rotation.y = Math.atan2(direction.x, direction.z);

        // 6. Validate placement (check both tiles the wall is between)
        const key1 = this.world.getTileKey(playerTileCoords.x, playerTileCoords.z);
        const key2 = this.world.getTileKey(targetTileX, targetTileZ);
        const tile1 = this.world.tiles[key1];
        const tile2 = this.world.tiles[key2];
        const isValid = tile1 && tile1.userData.unlocked && tile2 && tile2.userData.unlocked;

        if (isValid) {
            this.ghostWall.material = this.ghostMaterialValid;
        } else {
            this.ghostWall.material = this.ghostMaterialInvalid;
        }
    }

    placeItem() {
        if (!this.placementMode) return;

        const cost = 5; // Wall cost
        if (this.wood < cost) {
            console.log("Not enough wood to place the wall!");
            this.cancelPlacement();
            return;
        }

        // Re-run validation logic before placing
        const edgeIndex = this.ghostWall.userData.edgeIndex;
        const playerForward = new THREE.Vector3(0, 0, 1).applyEuler(this.player.mesh.rotation);
        const playerRight = new THREE.Vector3(1, 0, 0).applyEuler(this.player.mesh.rotation);
        let direction;
        switch (edgeIndex) {
            case 0: direction = playerForward; break;
            case 1: direction = playerRight; break;
            case 2: direction = playerForward.clone().negate(); break;
            case 3: direction = playerRight.clone().negate(); break;
        }
        const playerTileCoords = this.world.getTileCoordinates(this.player.mesh.position);
        const targetTileX = playerTileCoords.x + Math.round(direction.x);
        const targetTileZ = playerTileCoords.z + Math.round(direction.z);
        const key1 = this.world.getTileKey(playerTileCoords.x, playerTileCoords.z);
        const key2 = this.world.getTileKey(targetTileX, targetTileZ);
        const tile1 = this.world.tiles[key1];
        const tile2 = this.world.tiles[key2];
        const isValid = tile1 && tile1.userData.unlocked && tile2 && tile2.userData.unlocked;

        if (isValid) {
            this.wood -= cost;
            this.ui.updateWood(this.wood);

            const wall = new Wall(this.scene, this.ghostWall.position.clone(), this.ghostWall.rotation.clone());
            this.walls.push(wall);
            this.world.addObstacle(wall.mesh);

            this.placementMode = null;
            this.ghostWall.visible = false;
        } else {
            console.log("Cannot place item here."); // TODO: UI feedback
        }
    }

    destroyWall(wall) {
        this.wood += 5; // Refund
        this.ui.updateWood(this.wood);
        this.world.removeObstacle(wall.mesh);
        this.walls.splice(this.walls.indexOf(wall), 1);
        wall.destroy();
    }

    getClosestResource(maxDist) {
        let closestResource = null;
        let minDistance = Infinity;
        this.resourceManager.resources.forEach(resource => {
            const distance = this.player.mesh.position.distanceTo(resource.mesh.position);
            if (resource.mesh.parent && distance < minDistance) {
                minDistance = distance;
                closestResource = resource;
            }
        });
        return minDistance < maxDist ? closestResource : null;
    }

    getClosestWall(maxDist) {
        let closestWall = null;
        let minDistance = Infinity;
        this.walls.forEach(wall => {
            const distance = this.player.mesh.position.distanceTo(wall.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestWall = wall;
            }
        });
        return minDistance < maxDist ? closestWall : null;
    }

    getClosestUnlockableTile(maxDist) {
        let tileToUnlock = null;
        let minDistance = Infinity;
        Object.values(this.world.tiles).forEach(tile => {
            if (!tile.userData.unlocked) {
                const distance = this.player.mesh.position.distanceTo(tile.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    tileToUnlock = tile;
                }
            }
        });
        return minDistance < maxDist ? tileToUnlock : null;
    }

    doContextualAction() {
        if (this.placementMode) {
            this.placeItem();
            return;
        }

        const wallToDestroy = this.getClosestWall(2);
        if (wallToDestroy) {
            this.destroyWall(wallToDestroy);
            return;
        }

        if (this.getClosestResource(1)) {
            this.playerHarvest();
        } else if (this.player.mesh.position.distanceTo(this.base.position) < 2 && this.wood >= this.npcManager.npcCost.wood && this.stone >= this.npcManager.npcCost.stone) {
            this.buyNPC();
        } else if (this.getClosestUnlockableTile(1.5)) {
            this.unlockTile();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        if (this.placementMode) {
            this.updateGhostWallPosition();
        }

        this.cycleManager.update(delta);
        this.player.update(this, delta);
        if (this.resourceManager) this.resourceManager.update();
        if (this.enemyManager) this.enemyManager.update(this.base, delta);
        if (this.npcManager) {
            this.npcManager.update(this.resourceManager.resources, this, delta);
            this.ui.updateNpcCount(this.npcManager.npcs.length);
        }
        
        this.ui.updateHealth(this.player.health);

        this.camera.position.copy(this.player.mesh.position).add(this.cameraOffset);
        this.camera.lookAt(this.player.mesh.position);

        this.renderer.render(this.scene, this.camera);
    }
}