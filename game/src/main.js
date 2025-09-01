import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Resources
let wood = 0;
let stone = 0;
const woodDiv = document.getElementById('wood');
const stoneDiv = document.getElementById('stone');

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Materials
const unlockedMaterial = new THREE.MeshStandardMaterial({ color: 0x556B2F }); // DarkOliveGreen
const lockedMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });

// Base
const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 }); // Gold
const base = new THREE.Mesh(baseGeometry, baseMaterial);
base.position.set(0, 0, -2);
base.castShadow = true;
scene.add(base);

// NPCs
const npcs = [];
const npcCost = { wood: 10, stone: 10 };
const npcSpeed = 0.05;

// Resources
const resources = [];
const respawnQueue = [];
const respawnTime = 10000; // 10 seconds

function createResource(type, position) {
    let geometry, material;
    if (type === 'tree') {
        geometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
        material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    } else { // rock
        geometry = new THREE.IcosahedronGeometry(0.2, 0);
        material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    }
    const resource = new THREE.Mesh(geometry, material);
    resource.position.copy(position);
    resource.castShadow = true;
    resource.userData = { type, targeted: false };
    scene.add(resource);
    resources.push(resource);
}

// Grid
const tileSize = 2;
const tiles = {}; // Use an object to store tiles by coordinate string "x,z"

function getTileKey(x, z) {
    return `${x},${z}`;
}

function getTileCoordinates(position) {
    const x = Math.round(position.x / tileSize);
    const z = Math.round(position.z / tileSize);
    return { x, z };
}

function canMoveTo(position) {
    const { x, z } = getTileCoordinates(position);
    const key = getTileKey(x, z);
    return tiles[key] && tiles[key].userData.unlocked;
}


function createTile(x, z, unlocked = false) {
    const key = getTileKey(x, z);
    if (tiles[key]) {
        return tiles[key]; // Tile already exists
    }

    const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
    const tile = new THREE.Mesh(tileGeometry, unlocked ? unlockedMaterial : lockedMaterial);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x * tileSize, -0.5, z * tileSize);
    tile.receiveShadow = true;
    tile.userData = { unlocked, x, z };
    scene.add(tile);
    tiles[key] = tile;

    // Spawn resources on new tiles
    if (!unlocked) {
        if (Math.random() < 0.2) { // 20% chance to spawn a tree
            createResource('tree', new THREE.Vector3(tile.position.x, 0, tile.position.z));
        }
        if (Math.random() < 0.1) { // 10% chance to spawn a rock
            createResource('rock', new THREE.Vector3(tile.position.x, -0.2, tile.position.z));
        }
    }

    return tile;
}

// Create initial tiles
createTile(0, 0, true);
createTile(0, 1, false);
createTile(0, -1, false);
createTile(1, 0, false);
createTile(-1, 0, false);

createResource('tree', new THREE.Vector3(0.5, 0, 0.5));
createResource('rock', new THREE.Vector3(-0.5, -0.2, 0.5));


// Player Cube
const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const playerCube = new THREE.Mesh(playerGeometry, playerMaterial);
playerCube.position.set(0, 0, 0);
playerCube.castShadow = true;
scene.add(playerCube);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, 2, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Movement state
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

const moveSpeed = 0.1;

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();

  // Respawn resources
  for (let i = respawnQueue.length - 1; i >= 0; i--) {
    const item = respawnQueue[i];
    if (now >= item.respawnTime) {
      scene.add(item.object);
      item.object.userData.targeted = false;
      respawnQueue.splice(i, 1);
    }
  }

  // NPC AI
  npcs.forEach(npc => {
      if (npc.userData.state === 'IDLE') {
          let closestResource = null;
          let minDistance = Infinity;
          resources.forEach(resource => {
              if (resource.parent && !resource.userData.targeted) {
                  const distance = npc.position.distanceTo(resource.position);
                  if (distance < minDistance) {
                      minDistance = distance;
                      closestResource = resource;
                  }
              }
          });

          if (closestResource) {
              npc.userData.target = closestResource;
              closestResource.userData.targeted = true;
              npc.userData.state = 'MOVING_TO_RESOURCE';
          }
      } else if (npc.userData.state === 'MOVING_TO_RESOURCE') {
          const target = npc.userData.target;
          if (target && target.parent) {
              const direction = new THREE.Vector3().subVectors(target.position, npc.position).normalize();
              npc.position.add(direction.multiplyScalar(npcSpeed));

              if (npc.position.distanceTo(target.position) < 0.5) {
                  npc.userData.state = 'HARVESTING';
                  npc.userData.harvestingStartTime = now;
              }
          } else {
              npc.userData.state = 'IDLE';
          }
      } else if (npc.userData.state === 'HARVESTING') {
          if (now - npc.userData.harvestingStartTime > 2000) { // 2 seconds to harvest
              const target = npc.userData.target;
              if (target && target.parent) {
                  scene.remove(target);
                  if (target.userData.type === 'tree') {
                      wood += 1;
                      woodDiv.innerText = `Wood: ${wood}`;
                  } else {
                      stone += 1;
                      stoneDiv.innerText = `Stone: ${stone}`;
                  }
                  respawnQueue.push({ object: target, respawnTime: now + respawnTime });
              }
              npc.userData.state = 'IDLE';
          }
      }
  });


  // Player movement
  const nextPosition = playerCube.position.clone();
  if (keys.ArrowUp) nextPosition.z -= moveSpeed;
  if (keys.ArrowDown) nextPosition.z += moveSpeed;
  if (keys.ArrowLeft) nextPosition.x -= moveSpeed;
  if (keys.ArrowRight) nextPosition.x += moveSpeed;

  if (canMoveTo(nextPosition)) {
      playerCube.position.copy(nextPosition);
  }


  // Camera follows player
  camera.position.copy(playerCube.position).add(cameraOffset);
  camera.lookAt(playerCube.position);

  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Player Input
document.addEventListener('keydown', (event) => {
  if (event.key in keys) {
    event.preventDefault();
    keys[event.key] = true;
  }

  if (event.key === ' ') { // Space bar to harvest
    resources.forEach(resource => {
        if (resource.parent && playerCube.position.distanceTo(resource.position) < 1) {
            scene.remove(resource);
            if (resource.userData.type === 'tree') {
                wood += 1;
                woodDiv.innerText = `Wood: ${wood}`;
            } else {
                stone += 1;
                stoneDiv.innerText = `Stone: ${stone}`;
            }
            respawnQueue.push({ object: resource, respawnTime: Date.now() + respawnTime });
        }
    });
  }

  if (event.key === 'e') { // 'e' to unlock
    const unlockCost = 1;
    if (wood >= unlockCost) {
      let tileToUnlock = null;
      let minDistance = Infinity;

      Object.values(tiles).forEach(tile => {
        if (!tile.userData.unlocked) {
          const distance = playerCube.position.distanceTo(tile.position);
          if (distance < minDistance) {
            minDistance = distance;
            tileToUnlock = tile;
          }
        }
      });

      if (tileToUnlock && minDistance < 1.5) {
        wood -= unlockCost;
        woodDiv.innerText = `Wood: ${wood}`;
        tileToUnlock.material = unlockedMaterial;
        tileToUnlock.userData.unlocked = true;

        // Generate new adjacent tiles
        const { x, z } = tileToUnlock.userData;
        createTile(x + 1, z, false);
        createTile(x - 1, z, false);
        createTile(x, z + 1, false);
        createTile(x, z - 1, false);
      }
    }
  }

  if (event.key === 'b') { // 'b' to buy npc
    if (playerCube.position.distanceTo(base.position) < 2) {
        if (wood >= npcCost.wood && stone >= npcCost.stone) {
            wood -= npcCost.wood;
            stone -= npcCost.stone;
            woodDiv.innerText = `Wood: ${wood}`;
            stoneDiv.innerText = `Stone: ${stone}`;

            const npcGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const npcMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // white
            const npc = new THREE.Mesh(npcGeometry, npcMaterial);
            npc.position.copy(base.position);
            npc.castShadow = true;
            npc.userData = { state: 'IDLE', target: null };
            scene.add(npc);
            npcs.push(npc);
        }
    }
  }
});

document.addEventListener('keyup', (event) => {
  if (event.key in keys) {
    event.preventDefault();
    keys[event.key] = false;
  }
});