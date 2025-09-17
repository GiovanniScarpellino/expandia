import * as BABYLON from '@babylonjs/core';

// Basic implementation of a Priority Queue for the A* algorithm
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.elements.shift().element;
    }

    isEmpty() {
        return this.elements.length === 0;
    }
}

export class Pathfinder {
    /**
     * Finds a path from start to end using A* algorithm on the world grid.
     * @param {World} world The world instance containing the tiles.
     * @param {BABYLON.Vector3} startPos The starting position vector.
     * @param {BABYLON.Vector3} endPos The ending position vector.
     * @returns {BABYLON.Vector3[]} An array of Vector3 points representing the path, or an empty array if no path is found.
     */
    static findPath(world, startPos, endPos) {
        const startCoords = world.getTileCoordinates(startPos);
        const endCoords = world.getTileCoordinates(endPos);

        const startKey = world.getTileKey(startCoords.x, startCoords.z);
        const endKey = world.getTileKey(endCoords.x, endCoords.z);

        const startNode = world.tiles[startKey];
        const endNode = world.tiles[endKey];

        if (!startNode || !endNode || !startNode.metadata.unlocked || !endNode.metadata.unlocked) {
            console.warn("Pathfinder: Start or end tile is not valid or not unlocked.");
            return [];
        }

        const frontier = new PriorityQueue();
        frontier.enqueue(startKey, 0);

        const cameFrom = { [startKey]: null };
        const costSoFar = { [startKey]: 0 };

        while (!frontier.isEmpty()) {
            const currentKey = frontier.dequeue();

            if (currentKey === endKey) {
                return this.reconstructPath(cameFrom, currentKey, world);
            }

            const currentTile = world.tiles[currentKey];
            const { x, z } = currentTile.metadata;

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (Math.abs(i) === Math.abs(j)) continue; // No diagonal movement

                    const neighborX = x + i;
                    const neighborZ = z + j;
                    const neighborKey = world.getTileKey(neighborX, neighborZ);
                    const neighborNode = world.tiles[neighborKey];

                    if (neighborNode && neighborNode.metadata.unlocked) {
                        const newCost = costSoFar[currentKey] + 1; // Cost is 1 per tile

                        if (!(neighborKey in costSoFar) || newCost < costSoFar[neighborKey]) {
                            costSoFar[neighborKey] = newCost;
                            const priority = newCost + this.heuristic(neighborNode.position, endNode.position);
                            frontier.enqueue(neighborKey, priority);
                            cameFrom[neighborKey] = currentKey;
                        }
                    }
                }
            }
        }

        return []; // No path found
    }

    static heuristic(a, b) {
        // Manhattan distance on a grid
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }

    static reconstructPath(cameFrom, currentKey, world) {
        const path = [];
        let current = currentKey;
        while (current) {
            path.push(world.tiles[current].position.clone());
            current = cameFrom[current];
        }
        return path.reverse();
    }
}