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
        this.questManager = new QuestManager(this.ui, this);

        const resourceModels = {
            tree: this.models.trees,
            rock: this.models.rocks
        };
        this.resourceManager = new ResourceManager(this.scene, resourceModels);
        this.enemyManager = new EnemyManager(this.scene, this.models.enemy, this.questManager);
        
        this.player = new Player(this.scene, (pos) => this.world.canMoveTo(pos), this.models.player);
        this.inputHandler = new InputHandler(this);
        this.touchHandler = new TouchHandler(this);
        
        this.setupLights();
        
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('wheel', (event) => this.onMouseWheel(event));
    }

    init() {
        this.world = new World(this.scene, this.resourceManager, this.enemyManager);
        
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

        // Fetch the first quest
        this.questManager.getNewQuest({ wood: this.wood, stone: this.stone, unlockedTiles: 1 });

        this.animate();
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
                const animationDuration = action.getClip().duration * 1000; // in ms
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
                this.world.unlockTile(tileToUnlock);
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
        // Priority: Harvest > Buy NPC > Unlock Tile
        if (this.getClosestResource(1)) {
            this.playerHarvest();
        } else if (this.player.mesh.position.distanceTo(this.base.position) < 2 && this.wood >= this.npcManager.npcCost.wood && this.stone >= this.npcManager.npcCost.stone) {
            this.buyNPC();
        } else if (this.getClosestUnlockableTile(1.5)) {
            this.unlockTile();
        }
    }

    start() {
        this.init();
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
