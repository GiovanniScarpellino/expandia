export class Interactable {
    constructor(mesh, interactionDistance, onInteract, visualMesh) {
        this.mesh = mesh;
        this.interactionDistance = interactionDistance;
        this.onInteract = onInteract;
        this.visualMesh = visualMesh || mesh;
        this.mesh.interactable = this;
    }
}
