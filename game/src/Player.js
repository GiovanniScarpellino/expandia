import * as THREE from 'three';
import { Pathfinding } from './utils/Pathfinding.js';

export class Player {
    constructor(scene, canMoveTo, model) {
        this.scene = scene;
        this.canMoveTo = canMoveTo;
        this.health = 100;
        this.postureAttackDamage = 35;
        this.ruptureAttackDamage = 100;
        
        this.walkSpeed = 0.03;
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.acceleration = 0.005;
        this.deceleration = 0.01;
        
        this.mixer = null;
        this.actions = {};
        this.activeAction = null;

        this.mesh = model.scene;
        this.mesh.scale.set(0.1, 0.1, 0.1);
        this.mesh.position.set(0, -0.5, 0);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.scene.add(this.mesh);

        this.mixer = new THREE.AnimationMixer(this.mesh);

        const idleClip = THREE.AnimationClip.findByName(model.animations, 'idle');
        const walkClip = THREE.AnimationClip.findByName(model.animations, 'walk');
        const attackClip = THREE.AnimationClip.findByName(model.animations, 'attack-melee-right');
        const pickupClip = THREE.AnimationClip.findByName(model.animations, 'pick-up');

        if (idleClip) this.actions['idle'] = this.mixer.clipAction(idleClip);
        if (walkClip) this.actions['walk'] = this.mixer.clipAction(walkClip);
        if (attackClip) this.actions['attack'] = this.mixer.clipAction(attackClip);
        if (pickupClip) this.actions['pickup'] = this.mixer.clipAction(pickupClip);
        this.playAction('idle', false);

        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

        this.aiState = 'IDLE';
        this.aiObjective = null; // The overall goal (e.g., {type: 'CREATE_NPC'})
        this.aiTarget = null; // The specific object (e.g., a resource mesh)
        this.aiPath = null;
        this.aiActionTimeout = null;
    }

    playAction(actionName, loopOnce = true) {
        const action = this.actions[actionName];
        if (!action) return null;
        if (this.activeAction === action && !loopOnce) return action;

        const from = this.activeAction || this.actions['idle'];
        this.activeAction = action;

        from.fadeOut(0.2);
        this.activeAction.reset().setLoop(loopOnce ? THREE.LoopOnce : THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
        if (loopOnce) this.activeAction.clampWhenFinished = true;

        return action;
    }

    update(game, delta) {
        if (this.mixer) this.mixer.update(delta);

        if (game.isAutoMode) {
            this.updateAutoMode(game, delta);
        } else {
            this.aiObjective = null; // Reset AI when switching to manual
            this.aiState = 'IDLE';
            this.updateManualMode(delta);
        }
    }

    // --- AUTO MODE LOGIC ---
    updateAutoMode(game, delta) {
        if (this.aiState === 'IDLE') {
            this.playAction('idle', false);
            this.determineObjective(game);
            this.actOnObjective(game);
        } else if (this.aiState.startsWith('MOVING_TO')) {
            this.executeMove(game);
        } else if (this.aiState === 'HARVESTING') {
            this.executeHarvest(game);
        }
    }

    determineObjective(game) {
        if (this.aiObjective) return; // Already has an objective

        // Priority 1: Create NPC
        if (game.wood >= game.npcManager.npcCost.wood && game.stone >= game.npcManager.npcCost.stone) {
            this.aiObjective = { type: 'CREATE_NPC' };
            return;
        }

        // Priority 2: Collect Resources
        let closestResource = this.findClosestReachableResource(game);
        if (closestResource) {
            this.aiObjective = { type: 'COLLECT_RESOURCE', target: closestResource };
            return;
        }

        // Priority 3: Explore
        let tileToExplore = this.findTileToExplore(game);
        if (tileToExplore) {
            this.aiObjective = { type: 'EXPLORE', target: tileToExplore };
            return;
        }
    }

    actOnObjective(game) {
        if (!this.aiObjective) return; // No objective, do nothing

        switch (this.aiObjective.type) {
            case 'CREATE_NPC':
                if (game.wood < game.npcManager.npcCost.wood || game.stone < game.npcManager.npcCost.stone) {
                    this.aiObjective = null; // Can't afford anymore, rethink
                    return;
                }
                if (this.mesh.position.distanceTo(game.base.position) < 2) {
                    game.buyNPC();
                    this.aiObjective = null; // Objective complete
                } else {
                    this.aiPathTo(game.base.position, 'MOVING_TO_BASE_FOR_NPC', game);
                }
                break;

            case 'COLLECT_RESOURCE':
                const resource = this.aiObjective.target;
                if (!resource || !resource.mesh.parent) {
                    this.aiObjective = null; // Target is gone, rethink
                    return;
                }
                if (this.mesh.position.distanceTo(resource.mesh.position) < 1.2) {
                    this.aiTarget = resource;
                    this.aiState = 'HARVESTING';
                } else {
                    this.aiPathTo(resource.mesh.position, 'MOVING_TO_RESOURCE', game);
                }
                break;

            case 'EXPLORE':
                const tile = this.aiObjective.target;
                if (!tile || tile.userData.unlocked) {
                    this.aiObjective = null; // Tile already unlocked, rethink
                    return;
                }
                if (this.mesh.position.distanceTo(tile.position) < 1.5) {
                    game.unlockTile();
                    this.aiObjective = null; // Objective complete
                } else {
                    this.aiPathTo(tile.position, 'MOVING_TO_EXPLORE', game);
                }
                break;
        }
    }

    aiPathTo(position, nextState, game) {
        const path = Pathfinding.findPath(this.mesh.position, position, game.world);
        if (path && path.length > 1) {
            this.aiPath = path;
            this.aiPath.shift();
            this.aiState = nextState;
        } else {
            this.aiObjective = null; // No path found, rethink objective
        }
    }

    executeMove(game) {
        this.playAction('walk', false);
        if (!this.aiPath || this.aiPath.length === 0) {
            this.aiState = 'IDLE';
            return;
        }

        const targetPos = new THREE.Vector3(this.aiPath[0].x * game.world.tileSize, this.mesh.position.y, this.aiPath[0].z * game.world.tileSize);
        const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position);

        if (direction.length() > 0.01) {
            this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            this.mesh.position.add(direction.normalize().multiplyScalar(this.walkSpeed));
        }

        if (this.mesh.position.distanceTo(targetPos) < 0.1) {
            this.aiPath.shift();
            if (this.aiPath.length === 0) {
                this.aiState = 'IDLE'; // Arrived at destination, go to IDLE to perform action
            }
        }
    }

    executeHarvest(game) {
        this.playAction('pickup', true);
        if (this.aiActionTimeout) return;

        const animationDuration = (this.actions['pickup']?.getClip().duration || 1) * 1000;
        this.aiActionTimeout = setTimeout(() => {
            if (this.aiTarget) {
                const resourceType = game.resourceManager.harvestResource(this.aiTarget, this);
                if (resourceType) game.addResource(resourceType, 1);
            }
            this.aiTarget = null;
            this.aiObjective = null; // Harvest complete, find new objective
            this.aiState = 'IDLE';
            this.aiActionTimeout = null;
        }, animationDuration);
    }

    findClosestReachableResource(game) {
        let closestResource = null;
        let minDistance = Infinity;
        game.resourceManager.resources.forEach(resource => {
            if (resource.mesh.parent && game.world.canMoveTo(resource.mesh.position)) {
                const distance = this.mesh.position.distanceTo(resource.mesh.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestResource = resource;
                }
            }
        });
        return closestResource;
    }

    findTileToExplore(game) {
        let closestTile = null;
        let minDistance = Infinity;
        for (const key in game.world.tiles) {
            const tile = game.world.tiles[key];
            if (tile.userData.unlocked) continue;

            const neighbors = [{x:1,z:0}, {x:-1,z:0}, {x:0,z:1}, {x:0,z:-1}];
            for (const n of neighbors) {
                const neighborKey = game.world.getTileKey(tile.userData.x + n.x, tile.userData.z + n.z);
                const neighborTile = game.world.tiles[neighborKey];
                if (neighborTile && neighborTile.userData.unlocked) {
                    const distance = this.mesh.position.distanceTo(neighborTile.position);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestTile = neighborTile;
                    }
                }
            }
        }
        return closestTile;
    }

    // --- MANUAL MODE LOGIC ---
    updateManualMode(delta) {
        const attackAction = this.actions['attack'];
        const pickupAction = this.actions['pickup'];

        if ((this.activeAction === attackAction || this.activeAction === pickupAction) && !this.activeAction.isRunning()) {
            this.playAction('idle', false);
        }

        if (this.activeAction === attackAction || this.activeAction === pickupAction) {
            this.currentSpeed = 0;
            return;
        }

        const isMoving = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
        this.targetSpeed = isMoving ? this.walkSpeed : 0;

        if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + this.acceleration * delta * 60);
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed = Math.max(this.targetSpeed, this.currentSpeed - this.deceleration * delta * 60);
        }

        this.playAction((isMoving && this.currentSpeed > 0) ? 'walk' : 'idle', false);

        const direction = new THREE.Vector3();
        if (this.keys.ArrowUp) direction.z -= 1;
        if (this.keys.ArrowDown) direction.z += 1;
        if (this.keys.ArrowLeft) direction.x -= 1;
        if (this.keys.ArrowRight) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            const nextPosition = this.mesh.position.clone().add(direction.multiplyScalar(this.currentSpeed));
            if (this.canMoveTo(nextPosition)) {
                this.mesh.position.copy(nextPosition);
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }
}