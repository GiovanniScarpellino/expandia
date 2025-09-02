import * as THREE from 'three';
import { UI } from './UI.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { ResourceManager } from './managers/ResourceManager.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { NPCManager } from './managers/NPCManager.js';
import { InputHandler } from './InputHandler.js';
import { ModelLoader } from './utils/ModelLoader.js';

export class Game {
    constructor() {
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
        const modelLoader = new ModelLoader();
        
        this.resourceManager = new ResourceManager(this.scene, modelLoader);
        this.enemyManager = new EnemyManager(this.scene, modelLoader);
        
        this.player = new Player(this.scene, (pos) => this.world.canMoveTo(pos));
        this.inputHandler = new InputHandler(this);
        
        this.setupLights();
        
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('wheel', (event) => this.onMouseWheel(event));
    }

    async init() {
        const modelLoader = new ModelLoader();
        const baseModelPromise = modelLoader.load('/src/models/blade.glb');
        const loadPromises = [
            this.resourceManager.load(),
            this.enemyManager.load(),
        ];

        const [baseGltf] = await Promise.all([baseModelPromise, ...loadPromises]);
        
        this.world = new World(this.scene, this.resourceManager, this.enemyManager);
        
        this.base = baseGltf.scene;
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

        this.npcManager = new NPCManager(this.scene, this.base.position, modelLoader);
        await this.npcManager.load();

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
        this.player.playAttack();

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
                // Enemy is broken, deal health damage
                closestEnemy.takeDamage(this.player.ruptureAttackDamage);
            } else {
                // Enemy is not broken, deal posture damage
                closestEnemy.takePostureDamage(this.player.postureAttackDamage);
            }
        }
    }

    playerHarvest() {
        this.resourceManager.resources.forEach(resource => {
            if (resource.mesh.parent && this.player.mesh.position.distanceTo(resource.mesh.position) < 1) {
                const resourceType = this.resourceManager.harvestResource(resource, this.player);
                if (resourceType) {
                    this.addResource(resourceType, 1);
                }
            }
        });
    }

    unlockTile() {
        const unlockCost = 1;
        if (this.wood >= unlockCost) {
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

            if (tileToUnlock && minDistance < 1.5) {
                this.wood -= unlockCost;
                this.ui.updateWood(this.wood);
                this.world.unlockTile(tileToUnlock);
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

    start() {
        this.init();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        this.player.update(delta);
        if (this.resourceManager) this.resourceManager.update();
        if (this.enemyManager) this.enemyManager.update(this.player, delta);
        if (this.npcManager) this.npcManager.update(this.resourceManager.resources, this);
        
        this.ui.updateHealth(this.player.health);

        this.camera.position.copy(this.player.mesh.position).add(this.cameraOffset);
        this.camera.lookAt(this.player.mesh.position);

        this.renderer.render(this.scene, this.camera);
    }
}
