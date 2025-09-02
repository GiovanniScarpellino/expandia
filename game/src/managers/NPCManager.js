import { NPC } from '../NPC.js';

export class NPCManager {
    constructor(scene, basePosition, modelLoader) {
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.npcs = [];
        this.npcCost = { wood: 10, stone: 10 };
        this.basePosition = basePosition;
        this.model = null;
    }

    load() {
        return this.modelLoader.load('/src/models/character-a.glb').then(model => {
            this.model = model;
        });
    }

    createNPC() {
        if (this.model) {
            const npcPosition = this.basePosition.clone();
            npcPosition.y = -0.35; // Adjust y to be on the ground
            const npc = new NPC(this.scene, npcPosition, this.model.clone());
            this.npcs.push(npc);
        }
    }

    update(resources, game) {
        this.npcs.forEach(npc => npc.update(resources, game));
    }
}
