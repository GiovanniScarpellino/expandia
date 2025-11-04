export class Interactable {
    constructor(mesh, interactionDistance, onInteract, visualMesh) {
        this.mesh = mesh;
        this.interactionDistance = interactionDistance;
        this.originalOnInteract = onInteract; // Store the original callback
        this.onInteract = this.handleInteraction.bind(this); // Use a wrapper
        this.visualMesh = visualMesh || mesh;
        this.mesh.interactable = this;
        this.isDepleted = false; // New property
        this.resource = null; // Will be linked by ResourceManager
    }

    handleInteraction() {
        if (!this.isDepleted) {
            this.originalOnInteract(); // Execute original interaction logic
        }
    }

    deplete() {
        this.isDepleted = true;
        // Don't hide chests, just leave them open.
        if (this.resource && this.resource.type === 'chest') {
            // do nothing
        } else {
            this.visualMesh.setEnabled(false);
        }
    }

    reset() {
        this.isDepleted = false;
        // For chests, the MageChick handles the animation. For others, re-enable the mesh.
        if (this.resource && this.resource.type === 'chest') {
            // do nothing, animation is handled elsewhere
        } else {
            this.visualMesh.setEnabled(true);
        }
    }
}
