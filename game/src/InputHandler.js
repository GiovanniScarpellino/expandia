export class InputHandler {
    constructor(game) {
        this.game = game;
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
    }

    onKeyDown(event) {
        if (event.key in this.game.player.keys) {
            event.preventDefault();
            this.game.player.keys[event.key] = true;
        }

        if (event.key === 'f') { // Attack
            this.game.playerAttack();
        }

        if (event.key === ' ') { // Harvest
            this.game.playerHarvest();
        }

        if (event.key === 'e') { // Unlock
            this.game.unlockTile();
        }

        if (event.key === 'b') { // Buy NPC
            this.game.buyNPC();
        }
    }

    onKeyUp(event) {
        if (event.key in this.game.player.keys) {
            event.preventDefault();
            this.game.player.keys[event.key] = false;
        }
    }
}
