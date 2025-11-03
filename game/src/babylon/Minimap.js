export class Minimap {
    constructor(game) {
        this.game = game;
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.largeMapCanvas = document.getElementById('large-map');
        this.largeMapCtx = this.largeMapCanvas.getContext('2d');
    }

    update() {
        if (!this.game.hasMinimap) {
            this.minimapCanvas.style.display = 'none';
            return;
        }

        if (this.game.isMapLarge) {
            this.drawMap(this.largeMapCtx, 800, 10);
        } else {
            this.drawMap(this.minimapCtx, 200, 5);
        }
    }

    drawMap(ctx, size, scale) {
        if (this.game.gameMode === 'COMBAT') {
            this.minimapCanvas.style.display = 'none';
            return;
        }
        this.minimapCanvas.style.display = 'block';

        ctx.clearRect(0, 0, size, size);

        const playerX = this.game.player.hitbox.position.x;
        const playerZ = this.game.player.hitbox.position.z;

        ctx.save();
        ctx.translate(size / 2, size / 2);

        // Draw unlocked tiles
        ctx.fillStyle = '#555';
        for (const key in this.game.world.tiles) {
            const tile = this.game.world.tiles[key];
            if (tile.metadata.unlocked) {
                const x = (tile.position.x - playerX) * scale;
                const z = (tile.position.z - playerZ) * scale * -1; // Invert Z
                ctx.fillRect(x - this.game.world.tileSize / 2 * scale, z - this.game.world.tileSize / 2 * scale, this.game.world.tileSize * scale, this.game.world.tileSize * scale);
            }
        }

        // Draw resources
        this.game.resourceManager.resources.forEach(resource => {
            if (resource.mesh.isEnabled()) {
                const x = (resource.mesh.position.x - playerX) * scale;
                const z = (resource.mesh.position.z - playerZ) * scale * -1; // Invert Z
                if (resource.type === 'tree') {
                    ctx.fillStyle = '#2ECC71'; // green
                } else if (resource.type === 'rock') {
                    ctx.fillStyle = '#95A5A6'; // grey
                }
                ctx.fillRect(x - 2, z - 2, 4, 4);
            }
        });

        // Draw graves
        ctx.fillStyle = '#FFFFFF'; // white for graves
        this.game.graves.forEach(grave => {
            if (grave.isEnabled()) {
                const x = (grave.position.x - playerX) * scale;
                const z = (grave.position.z - playerZ) * scale * -1; // Invert Z
                ctx.fillRect(x - 2, z - 2, 4, 4);
            }
        });

        // Draw chicks
        ctx.fillStyle = '#00FFFF'; // cyan for chicks
        this.game.buildingManager.chicks.forEach(chick => {
            const x = (chick.hitbox.position.x - playerX) * scale;
            const z = (chick.hitbox.position.z - playerZ) * scale * -1; // Invert Z
            ctx.beginPath();
            ctx.arc(x, z, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw base
        const baseX = (0 - playerX) * scale;
        const baseZ = (0 - playerZ) * scale * -1; // Invert Z
        ctx.fillStyle = '#F1C40F'; // yellow
        ctx.fillRect(baseX - 2 * scale, baseZ - 2 * scale, 4 * scale, 4 * scale);

        // Draw player at the center
        ctx.fillStyle = '#E74C3C'; // red
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
    }
}
