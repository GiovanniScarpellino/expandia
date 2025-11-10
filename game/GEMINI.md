# Expandia

## Principe

Le joueur débute dans un lieu de départ composé d’arbres, de rochers et de sa base. Cette base lui permet de recruter des poussins, des personnages qui l’assisteront dans la collecte de bois et de rochers. L’univers est généré aléatoirement et peut être étendu en dépensant du bois pour débloquer de nouvelles tuiles et explorer plus loin.

Les recrus sont payants et spécifiques. Par exemple, l’achat d’un « Bucheron-poussin » nécessite du bois, tandis qu’un « Mineur-poussin » nécessite de la pierre. Ces recrus se chargeront automatiquement de collecter les ressources nécessaires. D’autres recrus seront également disponibles, comme le « Combatant-poussin », qui aidera aux combats.

Un système de combat avec de l’expérience est déjà codé. Actuellement, il fonctionne par vagues. Au cours de l’exploration, il peut avoir des tombes qui permettent d'activer les combats. Les combats fonctionnent en system de vague dans une petite arène.

---

## Documentation Technique du Système de Combat

### 1. Déclenchement du Combat

- **Fichier clé** : `src/managers/ResourceManager.js`
- **Mécanisme** : Le combat est initié par l'interaction du joueur avec un objet "tombe" (`grave`).
- **Logique** :
    1.  Lors de l'exploration, la fonction `spawnResource` a 15% de chance de générer une tombe sur une nouvelle tuile.
    2.  À cette tombe est attaché un composant `Interactable` (défini dans `src/babylon/Interactable.js`).
    3.  Lorsque le joueur interagit avec la tombe, le callback de l'`Interactable` exécute la méthode `this.game.startCombat()`.

### 2. Gestion et Orchestration du Combat

- **Fichier clé** : `src/BabylonGame.js`
- **Mécanisme** : La classe principale `BabylonGame` sert de chef d'orchestre.
- **Logique** :
    1.  La méthode `startCombat()` est appelée.
    2.  Le mode de jeu passe de `EXPLORATION` à `COMBAT`.
    3.  La position du joueur est sauvegardée (`playerReturnPosition`) et le joueur est téléporté au centre de l'arène de combat (`arenaCenter`).
    4.  Un compteur global, `this.combatCount`, est incrémenté. Cette variable sert de mesure de difficulté progressive.
    5.  Le `EnemyManager` est activé via sa méthode `start()`, en lui passant le `combatCount` actuel.

### 3. Génération des Ennemis et Difficulté

- **Fichier clé** : `src/managers/EnemyManager.js`
- **Mécanisme** : Ce manager contrôle toute la logique liée aux ennemis pendant un combat.
- **Logique** :
    1.  La méthode `start()` appelle `generateCombatConfig(combatCount)` pour créer une configuration de combat pour la session en cours.
    2.  `generateCombatConfig` est la fonction centrale pour la difficulté. Elle utilise `combatCount` pour déterminer :
        - Le **nombre** de chaque type d'ennemi (`Bug`, `ArmoredBug`, `Watchtower`).
        - Un **multiplicateur de vie** (`healthMultiplier`).
        - Un **multiplicateur de dégâts** (`damageMultiplier`).
        - La **récompense** en or (`goldReward`).
    3.  La méthode `spawnEnemies()` est ensuite appelée pour faire apparaître tous les ennemis de la configuration en une seule vague.

### 4. Fin du Combat

- **Fichiers clés** : `src/managers/EnemyManager.js`, `src/BabylonGame.js`
- **Mécanisme** : Le combat se termine lorsque le tableau `this.enemies` dans `EnemyManager` est vide.
- **Logique** :
    1.  Dans la boucle `update` de `EnemyManager`, si `this.enemies.length === 0`, la méthode `this.game.endCombat()` est appelée.
    2.  `endCombat()` dans `BabylonGame.js` redonne la récompense au joueur, arrête le `EnemyManager`, replace le joueur à sa position d'origine et repasse le mode de jeu à `EXPLORATION`.
