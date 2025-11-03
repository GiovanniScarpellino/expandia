export class Minimap {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('minimap');
        this.ctx = this.canvas.getContext('2d');
        this.scale = 5; // pixels per game unit
        this.size = 200; // canvas size
    }

    update() {
        if (!this.game.hasMinimap || this.game.gameMode === 'COMBAT') {
            this.canvas.style.display = 'none';
            return;
        }
        this.canvas.style.display = 'block';

        this.ctx.clearRect(0, 0, this.size, this.size);

        const playerX = this.game.player.hitbox.position.x;
        const playerZ = this.game.player.hitbox.position.z;

        this.ctx.save();
        this.ctx.translate(this.size / 2, this.size / 2);

        // Draw unlocked tiles
        this.ctx.fillStyle = '#555';
        for (const key in this.game.world.tiles) {
            const tile = this.game.world.tiles[key];
            if (tile.metadata.unlocked) {
                const x = (tile.position.x - playerX) * this.scale;
                const z = (tile.position.z - playerZ) * this.scale * -1; // Invert Z
                this.ctx.fillRect(x - this.game.world.tileSize / 2 * this.scale, z - this.game.world.tileSize / 2 * this.scale, this.game.world.tileSize * this.scale, this.game.world.tileSize * this.scale);
            }
        }

        // Draw resources
        this.game.resourceManager.resources.forEach(resource => {
            if (resource.mesh.isEnabled()) {
                const x = (resource.mesh.position.x - playerX) * this.scale;
                const z = (resource.mesh.position.z - playerZ) * this.scale * -1; // Invert Z
                if (resource.type === 'tree') {
                    this.ctx.fillStyle = '#2ECC71'; // green
                } else if (resource.type === 'rock') {
                    this.ctx.fillStyle = '#95A5A6'; // grey
                }
                this.ctx.fillRect(x - 2, z - 2, 4, 4);
            }
        });

        // Draw graves
        this.ctx.fillStyle = '#FFFFFF'; // white for graves
        this.game.graves.forEach(grave => {
            if (grave.isEnabled()) {
                const x = (grave.position.x - playerX) * this.scale;
                const z = (grave.position.z - playerZ) * this.scale * -1; // Invert Z
                this.ctx.fillRect(x - 2, z - 2, 4, 4);
            }
        });

        // Draw chicks
        this.ctx.fillStyle = '#00FFFF'; // cyan for chicks
        this.game.buildingManager.chicks.forEach(chick => {
            const x = (chick.hitbox.position.x - playerX) * this.scale;
            const z = (chick.hitbox.position.z - playerZ) * this.scale * -1; // Invert Z
            this.ctx.beginPath();
            this.ctx.arc(x, z, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });

        // Draw base
        const baseX = (0 - playerX) * this.scale;
        const baseZ = (0 - playerZ) * this.scale * -1; // Invert Z
        this.ctx.fillStyle = '#F1C40F'; // yellow
        this.ctx.fillRect(baseX - 2 * this.scale, baseZ - 2 * this.scale, 4 * this.scale, 4 * this.scale);

        // Draw player at the center
        this.ctx.fillStyle = '#E74C3C'; // red
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.restore();
    }
}
