
class Node {
    constructor(parent, pos) {
        this.parent = parent;
        this.pos = pos; // {x, z}

        this.g = 0; // distance from start
        this.h = 0; // heuristic (distance to end)
        this.f = 0; // g + h
    }
}

export class Pathfinding {
    static findPath(startPos, endPos, world) {
        const startNode = new Node(null, world.getTileCoordinates(startPos));
        const endNode = new Node(null, world.getTileCoordinates(endPos));

        const openList = [];
        const closedList = new Set();

        openList.push(startNode);

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f);
            const currentNode = openList.shift();
            closedList.add(world.getTileKey(currentNode.pos.x, currentNode.pos.z));

            if (currentNode.pos.x === endNode.pos.x && currentNode.pos.z === endNode.pos.z) {
                const path = [];
                let current = currentNode;
                while (current !== null) {
                    path.push(current.pos);
                    current = current.parent;
                }
                return path.reverse();
            }

            const children = [];
            const adjacentSquares = [
                { x: 0, z: -1 }, { x: 0, z: 1 },
                { x: -1, z: 0 }, { x: 1, z: 0 }
            ];

            for (const newPos of adjacentSquares) {
                const nodePos = {
                    x: currentNode.pos.x + newPos.x,
                    z: currentNode.pos.z + newPos.z
                };

                const tileKey = world.getTileKey(nodePos.x, nodePos.z);
                const tile = world.tiles[tileKey];

                if (!tile || !tile.userData.unlocked) {
                    continue;
                }

                if (closedList.has(tileKey)) {
                    continue;
                }

                const newNode = new Node(currentNode, nodePos);
                children.push(newNode);
            }

            for (const child of children) {
                child.g = currentNode.g + 1;
                child.h = Math.abs(child.pos.x - endNode.pos.x) + Math.abs(child.pos.z - endNode.pos.z);
                child.f = child.g + child.h;

                const existingNode = openList.find(openNode => openNode.pos.x === child.pos.x && openNode.pos.z === child.pos.z);
                if (existingNode && child.g > existingNode.g) {
                    continue;
                }

                openList.push(child);
            }
        }

        return null; // No path found
    }
}
