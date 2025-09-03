export class QuestManager {
    constructor(ui, game) {
        this.ui = ui;
        this.game = game; // Reference to the game to give rewards
        this.currentQuest = null;
        this.questApiUrl = 'http://localhost:3000/generate-quest';
    }

    async getNewQuest(gameState) {
        this.ui.updateQuest("Génération d'un nouvel objectif...");
        try {
            const response = await fetch(this.questApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameState }),
            });

            if (!response.ok) {
                throw new Error(`Erreur du serveur: ${response.status}`);
            }

            const quest = await response.json();
            this.currentQuest = quest;
            this.currentQuest.progress = 0; // Initialize progress
            
            this.ui.updateQuest(`${this.currentQuest.story} (${this.currentQuest.progress}/${this.currentQuest.objective.target})`);
            
            console.log("Nouvelle quête reçue:", this.currentQuest);

        } catch (error) {
            console.error("Impossible de récupérer une nouvelle quête (serveur optionnel):", error.message);
            this.ui.hideQuest();
        }
    }

    checkProgress(actionType, data) {
        if (!this.currentQuest || this.currentQuest.progress >= this.currentQuest.objective.target) return;

        const { type, resource, target } = this.currentQuest.objective;

        let questAdvanced = false;
        if (actionType === type) {
            if (type === 'collect_resource') {
                const resourceMap = { tree: 'wood', rock: 'stone' };
                if (resourceMap[data.type] === resource) {
                    this.currentQuest.progress += data.amount;
                    questAdvanced = true;
                }
            } else if (type === 'unlock_tile') {
                this.currentQuest.progress += 1;
                questAdvanced = true;
            } else if (type === 'defeat_enemy') {
                this.currentQuest.progress += 1;
                questAdvanced = true;
            }
        }

        if (questAdvanced) {
            if (this.currentQuest.progress >= target) {
                this.currentQuest.progress = target; // Clamp progress to target
                this.ui.updateQuest(`${this.currentQuest.story} (Terminé !)`)
                this.completeQuest();
            } else {
                this.ui.updateQuest(`${this.currentQuest.story} (${this.currentQuest.progress}/${target})`);
            }
        }
    }

    completeQuest() {
        console.log("Quête terminée ! Récompense:", this.currentQuest.reward);
        // Give reward
        if (this.currentQuest.reward && this.currentQuest.reward.resource) {
            this.game.addResource(this.currentQuest.reward.resource, this.currentQuest.reward.amount);
        }

        // Get next quest
        const newGameState = { 
            wood: this.game.wood, 
            stone: this.game.stone, 
            unlockedTiles: Object.keys(this.game.world.tiles).length
        };
        setTimeout(() => this.getNewQuest(newGameState), 2000); // Wait 2s before getting a new quest
    }
}
