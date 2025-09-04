import * as THREE from 'three';
import { UI } from './UI.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { ResourceManager } from './managers/ResourceManager.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { NPCManager } from './managers/NPCManager.js';
import { InputHandler } from './InputHandler.js';
import { QuestManager } from './managers/QuestManager.js';
import { TouchHandler } from './TouchHandler.js';
import { GameStateManager } from './managers/GameStateManager.js';

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

        this.ui = new UI();
        this.gameStateManager = new GameStateManager();
        this.autoSaveInterval = null;

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
        
        this.setupLights();
        
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
        this.scene.add(this.base);

        this.npcManager = new NPCManager(this.scene, this.base.position, this.models.npc);

        this.questManager.getNewQuest({ wood: this.wood, stone: this.stone, unlockedTiles: Object.keys(this.world.tiles).length });

        
    }

    initNewGame() {
        this.world.init();
        this.resourceManager.createResource('tree', new THREE.Vector3(0.5, this.world.yOffset, 0.5));
        this.resourceManager.createResource('rock', new THREE.Vector3(-0.5, this.world.yOffset, 0.5));
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
            }
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

        this.initSharedComponents();

        const npcCount = savedState.npcs.count;
        for (let i = 0; i < npcCount; i++) {
            this.npcManager.createNPC(true);
        }
        
        this.ui.updateWood(this.wood);
        this.ui.updateStone(this.stone);
        this.ui.updateHealth(this.player.health);
    }

    setupLights() {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);
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
                
                newTilesInfo.forEach(info => {
                    // Only spawn on tiles that were newly created
                    if (info.isNew) {
                        const coords = info.coords;
                        const tilePos = new THREE.Vector3(coords.x * this.world.tileSize, this.world.yOffset, coords.z * this.world.tileSize);
                        
                        // Spawn Tree
                        if (Math.random() < 0.2) {
                            const pos = tilePos.clone().add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(this.world.tileSize * 0.8));
                            this.resourceManager.createResource('tree', pos);
                        }
                        // Spawn Rock
                        if (Math.random() < 0.1) {
                            const pos = tilePos.clone().add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(this.world.tileSize * 0.8));
                            this.resourceManager.createResource('rock', pos);
                        }
                        // Spawn Enemy
                        if (Math.random() < 0.05) {
                            const pos = tilePos.clone().add(new THREE.Vector3(0, 0.3, 0)); // Enemies are slightly elevated
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

        this.player.update(delta);
        if (this.resourceManager) this.resourceManager.update();
        if (this.enemyManager) this.enemyManager.update(this.player, delta);
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
