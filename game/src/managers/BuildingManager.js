import * as BABYLON from '@babylonjs/core';
import { LumberjackChick } from '../babylon/LumberjackChick.js';
import { MinerChick } from '../babylon/MinerChick.js';

export class BuildingManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.chicks = [];
    }

    createLumberjackChick() {
        const cost = 10;
        if (this.game.wood >= cost) {
            this.game.addResource('tree', -cost);
            const spawnPosition = this.game.base.position.add(new BABYLON.Vector3(2, 0, -2));
            const chick = new LumberjackChick(this.game, spawnPosition);
            this.chicks.push(chick);
            return true;
        } else {
            return false;
        }
    }

    createMinerChick() {
        const cost = 10;
        if (this.game.stone >= cost) {
            this.game.addResource('rock', -cost);
            const spawnPosition = this.game.base.position.add(new BABYLON.Vector3(-2, 0, -2));
            const chick = new MinerChick(this.game, spawnPosition);
            this.chicks.push(chick);
            return true;
        } else {
            return false;
        }
    }
}
