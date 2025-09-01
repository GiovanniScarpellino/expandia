import { NPC } from '../NPC.js';

export class NPCManager {
    constructor(scene, basePosition) {
        this.scene = scene;
        this.npcs = [];
        this.npcCost = { wood: 10, stone: 10 };
        this.basePosition = basePosition;
    }

    createNPC() {
        const npcPosition = this.basePosition.clone();
        npcPosition.y = -0.35; // Adjust y to be on the ground
        const npc = new NPC(this.scene, npcPosition);
        this.npcs.push(npc);
    }

    update(resources, game) {
        this.npcs.forEach(npc => npc.update(resources, game));
    }
}
