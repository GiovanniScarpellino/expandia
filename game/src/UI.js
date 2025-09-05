export class UI {
    constructor() {
        // Resource elements
        this.woodSpan = document.querySelector('#wood span');
        this.stoneSpan = document.querySelector('#stone span');

        // Player stats elements
        this.healthDiv = document.getElementById('health');
        this.baseHealthDiv = document.getElementById('base-health');
        this.npcCountDiv = document.getElementById('npc-count');

        // Cycle elements
        this.dayCounterDiv = document.getElementById('day-counter');
        this.cycleStatusDiv = document.getElementById('cycle-status');
        this.cycleTimerDiv = document.getElementById('cycle-timer');

        // Quest element
        this.questDiv = document.getElementById('quest');

        // Build menu elements
        this.buildMenuButton = document.getElementById('build-menu-button');
        this.closeBuildMenuButton = document.getElementById('close-build-menu-button');
        this.buildMenu = document.getElementById('build-menu');
        this.craftButtons = document.querySelectorAll('.craft-button');

        // Save indicator
        this.saveIndicatorDiv = document.createElement('div');
        this.saveIndicatorDiv.id = 'save-indicator';
        this.saveIndicatorDiv.innerText = 'Partie sauvegardée !';
        document.body.appendChild(this.saveIndicatorDiv);

        // Crafting callback
        this.onCraft = null;

        // Initial state
        this.updateWood(0);
        this.updateStone(0);
        this.updateHealth(100);
        this.updateBaseHealth(1000, 1000);
        this.updateNpcCount(0);
        this.updateQuest("Trouvez des ressources pour survivre.");

        // Event Listeners
        this.buildMenuButton.addEventListener('click', () => this.toggleBuildMenu());
        this.closeBuildMenuButton.addEventListener('click', () => this.toggleBuildMenu(false));

        this.craftButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const itemName = event.currentTarget.dataset.item;
                if (this.onCraft) {
                    this.onCraft(itemName);
                }
                this.toggleBuildMenu(false); // Close menu after crafting
            });
        });
    }

    toggleBuildMenu(forceState) {
        const shouldShow = forceState === undefined ? this.buildMenu.style.display === 'none' : forceState;
        this.buildMenu.style.display = shouldShow ? 'flex' : 'none';
    }

    showSaveIndicator() {
        this.saveIndicatorDiv.classList.add('show');
        setTimeout(() => {
            this.saveIndicatorDiv.classList.remove('show');
        }, 2000);
    }

    updateWood(amount) {
        this.woodSpan.innerText = amount;
    }

    updateStone(amount) {
        this.stoneSpan.innerText = amount;
    }

    updateHealth(amount) {
        this.healthDiv.innerHTML = `<i class="fas fa-heart"></i> ${amount}`;
    }

    updateBaseHealth(health, maxHealth) {
        this.baseHealthDiv.innerHTML = `<i class="fas fa-shield-alt"></i> ${health}`;
    }

    updateQuest(text) {
        if (text) {
            this.questDiv.innerHTML = text;
            this.showQuest();
        } else {
            this.hideQuest();
        }
    }

    hideQuest() {
        this.questDiv.style.display = 'none';
    }

    showQuest() {
        this.questDiv.style.display = 'block';
    }

    updateNpcCount(count) {
        this.npcCountDiv.innerHTML = `<i class="fas fa-users"></i> ${count}`;
    }

    updateCycle(isDay, timeOfDay, daysSurvived) {
        this.dayCounterDiv.innerText = `Jour ${daysSurvived}`;
        this.cycleStatusDiv.innerText = isDay ? 'Jour' : 'Nuit';

        const totalSeconds = Math.floor(timeOfDay / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        this.cycleTimerDiv.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}