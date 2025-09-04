export class GameStateManager {
    constructor() {
        this.saveKey = 'expandia-savegame';
    }

    save(state) {
        try {
            const jsonState = JSON.stringify(state);
            localStorage.setItem(this.saveKey, jsonState);
            console.log("Game saved successfully.");
        } catch (error) {
            console.error("Error saving game state:", error);
        }
    }

    load() {
        try {
            const jsonState = localStorage.getItem(this.saveKey);
            if (jsonState === null) {
                return null;
            }
            return JSON.parse(jsonState);
        } catch (error) {
            console.error("Error loading game state:", error);
            return null;
        }
    }

    hasSave() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    deleteSave() {
        localStorage.removeItem(this.saveKey);
        console.log("Save game deleted.");
    }
}
