import { NPC } from '../NPC.js';

export class NPCManager {
    constructor(scene, basePosition, model) {
        this.scene = scene;
        this.npcs = [];
        this.npcCost = { wood: 10, stone: 10 };
        this.basePosition = basePosition;
        this.model = model.scene;
        this.animations = model.animations;
    }

    createNPC(fromSave = false) {
        if (this.model) {
            const npcPosition = this.basePosition.clone();
            npcPosition.y = -0.35; // Adjust y to be on the ground
            const npc = new NPC(this.scene, npcPosition, this.model.clone(), this.animations);
            this.npcs.push(npc);
        }
    }

    update(resources, game, delta) {
        this.npcs.forEach(npc => npc.update(resources, game, delta));
    }
}
