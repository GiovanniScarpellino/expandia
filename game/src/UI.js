export class UI {
    constructor() {
        this.woodDiv = document.getElementById('wood');
        this.stoneDiv = document.getElementById('stone');
        this.healthDiv = document.getElementById('health');
        this.questDiv = document.getElementById('quest');
        this.npcCountDiv = document.getElementById('npc-count');
        this.dayCounterDiv = document.getElementById('day-counter');
        this.cycleStatusDiv = document.getElementById('cycle-status');
        this.cycleTimerDiv = document.getElementById('cycle-timer');

        this.updateWood(0);
        this.updateStone(0);
        this.updateHealth(100);
        this.updateQuest("En attente d'un objectif...");
        this.updateNpcCount(0);

        this.saveIndicatorDiv = document.createElement('div');
        this.saveIndicatorDiv.id = 'save-indicator';
        this.saveIndicatorDiv.innerText = 'Partie sauvegardée !';
        document.body.appendChild(this.saveIndicatorDiv);
    }

    showSaveIndicator() {
        this.saveIndicatorDiv.classList.add('show');
        setTimeout(() => {
            this.saveIndicatorDiv.classList.remove('show');
        }, 2000);
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

    updateCycle(isDay, timeOfDay, daysSurvived) {
        this.dayCounterDiv.innerText = `Jour: ${daysSurvived}`;
        this.cycleStatusDiv.innerText = `Phase: ${isDay ? 'Jour' : 'Nuit'}`;

        const minutes = Math.floor(timeOfDay / 60000);
        const seconds = ((timeOfDay % 60000) / 1000).toFixed(0);
        this.cycleTimerDiv.innerText = `Temps restant: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}
