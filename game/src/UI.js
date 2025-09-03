export class UI {
    constructor() {
        this.woodDiv = document.getElementById('wood');
        this.stoneDiv = document.getElementById('stone');
        this.healthDiv = document.getElementById('health');
        this.questDiv = document.getElementById('quest');
        this.npcCountDiv = document.getElementById('npc-count');
        this.updateWood(0);
        this.updateStone(0);
        this.updateHealth(100);
        this.updateQuest("En attente d'un objectif...");
        this.updateNpcCount(0);
    }

    updateWood(amount) {
        this.woodDiv.innerText = `Bois: ${amount}`;
    }

    updateStone(amount) {
        this.stoneDiv.innerText = `Pierre: ${amount}`;
    }

    updateHealth(amount) {
        this.healthDiv.innerText = `Vie: ${amount}`;
    }

    updateQuest(text) {
        this.showQuest();
        this.questDiv.innerHTML = `Objectif: ${text}`;
    }

    hideQuest() {
        this.questDiv.style.display = 'none';
    }

    showQuest() {
        this.questDiv.style.display = 'block';
    }

    updateNpcCount(count) {
        this.npcCountDiv.innerText = `PNJs: ${count}`;
    }
}
