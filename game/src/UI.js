export class UI {
    constructor(game) {
        this.game = game;

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
        this.craftingItems = document.querySelectorAll('.crafting-item');

        // Recruitment menu elements
        this.recruitmentMenu = document.getElementById('recruitment-menu');
        this.closeRecruitmentMenuButton = document.getElementById('close-recruitment-menu-button');
        this.recruitmentItems = document.querySelectorAll('.recruitment-item');

        // Debug
        this.startNightButton = document.getElementById('start-night-button');

        // Save indicator
        this.saveIndicatorDiv = document.createElement('div');
        this.saveIndicatorDiv.id = 'save-indicator';
        this.saveIndicatorDiv.innerText = 'Partie sauvegardée !';
        document.body.appendChild(this.saveIndicatorDiv);

        // Callbacks
        this.onBuildMenuToggled = null;
        this.onItemSelected = null;
        this.onRecruitNpc = null;

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
        this.makeDraggable(this.buildMenu, this.buildMenu.querySelector('.panel-header'));

        this.closeRecruitmentMenuButton.addEventListener('click', () => this.toggleRecruitmentMenu(false));
        this.makeDraggable(this.recruitmentMenu, this.recruitmentMenu.querySelector('.panel-header'));

        this.startNightButton.addEventListener('click', () => {
            this.game.cycleManager.startNight();
        });

        this.craftingItems.forEach(item => {
            item.addEventListener('click', (event) => {
                this.game.canvas.focus();
                const itemType = event.currentTarget.dataset.item;
                if (this.onItemSelected) {
                    this.onItemSelected(itemType);
                }
            });
        });

        this.recruitmentItems.forEach(item => {
            item.addEventListener('click', (event) => {
                const npcType = event.currentTarget.dataset.npc;
                if (this.onRecruitNpc) {
                    this.onRecruitNpc(npcType);
                }
                this.toggleRecruitmentMenu(false); // Close menu after selection
            });
        });
    }

    makeDraggable(element, handle) {
        let isDragging = false;
        let offsetX, offsetY;

        const onMouseDown = (e) => {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            element.style.left = `${e.clientX - offsetX}px`;
            element.style.top = `${e.clientY - offsetY}px`;
            // Remove transform to prevent conflict with positioning
            element.style.transform = ''; 
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);
    }

    toggleBuildMenu(forceState) {
        const shouldShow = forceState === undefined ? this.buildMenu.style.display === 'none' : forceState;
        this.buildMenu.style.display = shouldShow ? 'block' : 'none';
        if (this.onBuildMenuToggled) {
            this.onBuildMenuToggled(shouldShow);
        }
        if (shouldShow) {
            this.toggleRecruitmentMenu(false); // Ensure other panel is closed
        }
    }

    toggleRecruitmentMenu(forceState) {
        const shouldShow = forceState === undefined ? this.recruitmentMenu.style.display === 'none' : forceState;
        this.recruitmentMenu.style.display = shouldShow ? 'block' : 'none';
        if (shouldShow) {
            this.toggleBuildMenu(false); // Ensure other panel is closed
        }
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
