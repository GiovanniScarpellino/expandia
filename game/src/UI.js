export class UI {
    constructor() {
        this.woodDiv = document.getElementById('wood');
        this.stoneDiv = document.getElementById('stone');
        this.healthDiv = document.getElementById('health');
        this.updateWood(0);
        this.updateStone(0);
        this.updateHealth(100);
    }

    updateWood(amount) {
        this.woodDiv.innerText = `Wood: ${amount}`;
    }

    updateStone(amount) {
        this.stoneDiv.innerText = `Stone: ${amount}`;
    }

    updateHealth(amount) {
        this.healthDiv.innerText = `Health: ${amount}`;
    }
}
