import * as THREE from 'three';
import { UI } from './UI.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { ResourceManager } from './managers/ResourceManager.js';
import { EnemyManager } from './managers/EnemyManager.js';
import { NPCManager } from './managers/NPCManager.js';
import { InputHandler } from './InputHandler.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.clock = new THREE.Clock();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraOffset = new THREE.Vector3(0, 1.5, 2.5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.wood = 0;
        this.stone = 0;

        this.ui = new UI();
        this.enemyManager = new EnemyManager(this.scene);
        this.resourceManager = new ResourceManager(this.scene);
        this.world = new World(this.scene, this.resourceManager, this.enemyManager);
        this.player = new Player(this.scene, (pos) => this.world.canMoveTo(pos));
        
        const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        this.base = new THREE.Mesh(baseGeometry, baseMaterial);
        this.base.position.set(0, 0, -2);
        this.base.castShadow = true;
        this.scene.add(this.base);

        this.npcManager = new NPCManager(this.scene, this.base.position);
        this.inputHandler = new InputHandler(this);

        this.setupLights();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
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

    playerAttack() {
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
            if (closestEnemy.takeDamage(this.player.attackDamage)) {
                this.enemyManager.removeEnemy(closestEnemy);
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
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        this.player.update(delta);
        this.resourceManager.update();
        this.enemyManager.update(this.player);
        this.npcManager.update(this.resourceManager.resources, this);
        
        this.ui.updateHealth(this.player.health);

        this.camera.position.copy(this.player.mesh.position).add(this.cameraOffset);
        this.camera.lookAt(this.player.mesh.position);

        this.renderer.render(this.scene, this.camera);
    }
}
