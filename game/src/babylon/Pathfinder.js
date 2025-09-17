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
     * The path will lead to the end tile if it's unlocked, or to an adjacent unlocked tile if it's locked.
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

        // The start node must always be valid and unlocked.
        if (!startNode || !endNode || !startNode.metadata.unlocked) {
            return [];
        }

        // Determine the goal(s) for the pathfinder
        let goalKeys = [];
        if (endNode.metadata.unlocked) {
            // If the destination tile is unlocked, that's our only goal.
            goalKeys.push(endKey);
        } else {
            // If the destination tile is locked, our goals are all of its unlocked neighbors.
            const { x, z } = endNode.metadata;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (Math.abs(i) === Math.abs(j)) continue; // No diagonals
                    const neighborKey = world.getTileKey(x + i, z + j);
                    const neighborNode = world.tiles[neighborKey];
                    if (neighborNode && neighborNode.metadata.unlocked) {
                        goalKeys.push(neighborKey);
                    }
                }
            }
        }

        if (goalKeys.length === 0) {
            // No path possible if the destination is locked and has no unlocked neighbors.
            return [];
        }

        const frontier = new PriorityQueue();
        frontier.enqueue(startKey, 0);

        const cameFrom = { [startKey]: null };
        const costSoFar = { [startKey]: 0 };

        while (!frontier.isEmpty()) {
            const currentKey = frontier.dequeue();

            // If we've reached one of our goal tiles, we're done.
            if (goalKeys.includes(currentKey)) {
                const path = this.reconstructPath(cameFrom, currentKey, world);
                return path;
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

                    const edgeKey = [currentKey, neighborKey].sort().join('_');
                    const isBlocked = world.blockedEdges && world.blockedEdges.has(edgeKey);

                    if (neighborNode && neighborNode.metadata.unlocked && !isBlocked) {
                        const newCost = costSoFar[currentKey] + 1;

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
