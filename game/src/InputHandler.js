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

        if (event.key === 'e') { // Contextual Action
            this.game.doContextualAction();
        }

        if (event.key === 'r') { // Rotate placement
            if (this.game.placementMode) {
                this.game.rotatePlacementGhost();
            }
        }

        if (event.key === 'Escape') { // Cancel placement
            if (this.game.placementMode) {
                this.game.cancelPlacement();
            }
        }
    }

    onKeyUp(event) {
        if (event.key in this.game.player.keys) {
            event.preventDefault();
            this.game.player.keys[event.key] = false;
        }
    }
}
