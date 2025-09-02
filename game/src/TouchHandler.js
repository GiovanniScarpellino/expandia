export class TouchHandler {
    constructor(game) {
        this.game = game;
        this.player = game.player;

        this.joystickArea = document.getElementById('joystick-area');
        this.joystick = document.getElementById('joystick');
        this.attackButton = document.getElementById('attack-button');
        this.contextButton = document.getElementById('context-button');

        this.joystickCenter = { x: 0, y: 0 };
        this.joystickRadius = 0;

        this.isDragging = false;

        this.init();
    }

    init() {
        if (!this.joystickArea || !this.joystick || !this.attackButton || !this.contextButton) {
            console.log("Mobile controls not found, not initializing touch handler.");
            return;
        }

        const rect = this.joystickArea.getBoundingClientRect();
        this.joystickCenter.x = rect.left + rect.width / 2;
        this.joystickCenter.y = rect.top + rect.height / 2;
        this.joystickRadius = rect.width / 2;

        this.joystickArea.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.joystickArea.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.joystickArea.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

        this.attackButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game.playerAttack();
        });

        this.contextButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game.doContextualAction();
        });
    }

    onTouchStart(event) {
        event.preventDefault();
        this.isDragging = true;
        this.updateJoystick(event.touches[0]);
    }

    onTouchMove(event) {
        event.preventDefault();
        if (this.isDragging) {
            this.updateJoystick(event.touches[0]);
        }
    }

    onTouchEnd(event) {
        event.preventDefault();
        this.isDragging = false;
        this.resetJoystick();
    }

    updateJoystick(touch) {
        const dx = touch.clientX - this.joystickCenter.x;
        const dy = touch.clientY - this.joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const clampedDistance = Math.min(distance, this.joystickRadius);
        const joystickX = clampedDistance * Math.cos(angle);
        const joystickY = clampedDistance * Math.sin(angle);

        this.joystick.style.transform = `translate(${joystickX}px, ${joystickY}px)`;

        // Reset keys
        this.player.keys.ArrowUp = false;
        this.player.keys.ArrowDown = false;
        this.player.keys.ArrowLeft = false;
        this.player.keys.ArrowRight = false;

        // Determine direction based on angle and a threshold
        const threshold = Math.PI / 4; // 45 degrees threshold for diagonals

        if (Math.abs(dx) > this.joystickRadius * 0.2 || Math.abs(dy) > this.joystickRadius * 0.2) {
             if (angle > -threshold && angle < threshold) {
                this.player.keys.ArrowRight = true;
            } else if (angle > threshold && angle < Math.PI - threshold) {
                this.player.keys.ArrowDown = true;
            } else if (angle > Math.PI - threshold || angle < -Math.PI + threshold) {
                this.player.keys.ArrowLeft = true;
            } else if (angle < -threshold && angle > -Math.PI + threshold) {
                this.player.keys.ArrowUp = true;
            }
        }
    }

    resetJoystick() {
        this.joystick.style.transform = 'translate(0, 0)';
        // Reset all keys
        this.player.keys.ArrowUp = false;
        this.player.keys.ArrowDown = false;
        this.player.keys.ArrowLeft = false;
        this.player.keys.ArrowRight = false;
    }
}
