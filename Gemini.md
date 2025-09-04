🎮 Projet : Jeu de Survie & Tower Defense avec Three.js + IA (Gemini)

⸻

🚀 Vision

Un jeu de survie en 3D où le joueur doit explorer et récolter des ressources le jour pour construire des défenses et survivre à des hordes d'ennemis qui attaquent sa base la nuit. L'objectif est de survivre le plus de jours possible face à une difficulté croissante.

⸻

🔄 Boucle de Gameplay

Le jeu est divisé en deux phases distinctes :

☀️ **Phase de Jour**
*   **Exploration & Collecte :** Le joueur explore la carte pour trouver et récolter des ressources (bois, pierre, etc.).
*   **Artisanat & Construction :** Utilisation des ressources pour fabriquer des outils, des armes, et surtout des fortifications (murs, pièges).
*   **Gestion :** Recrutement et assignation de PNJ pour automatiser certaines tâches (collecte, défense).

🌙 **Phase de Nuit**
*   **Assaut :** Des vagues d'ennemis apparaissent aux limites du monde exploré.
*   **Défense :** Les ennemis attaquent le joueur, les PNJ, et ciblent en priorité la base principale.
*   **Survie :** Le joueur doit utiliser ses constructions et ses compétences pour survivre jusqu'à l'aube.

⸻

🗺️ Roadmap — Prochaine Étape : Le Cycle de Survie

🎯 **Objectif :** Implémenter la boucle de gameplay Jour/Nuit de base.

1.  **Mise en place du Cycle Jour/Nuit :**
    *   Créer un `CycleManager` pour gérer le temps (durée du jour/nuit) et l'éclairage de la scène.
    *   Ajouter un compteur de "Jours Survécus" à l'interface utilisateur.

2.  **Mécaniques de la Nuit :**
    *   Faire apparaître des vagues d'ennemis à la tombée de la nuit.
    *   Modifier l'IA ennemie pour qu'elle cible la base.
    *   Donner des points de vie à la base et créer une condition de "Game Over".

3.  **Mécaniques de Défense (Initiales) :**
    *   Intégrer un système d'artisanat de base.
    *   Permettre au joueur de fabriquer et de placer un premier type de fortification (ex: Mur en bois).

⸻

⚙️ Stack technique
*   Rendu 3D : Three.js
*   Langage : JavaScript/TypeScript
*   Build : Vite
*   Sauvegarde : LocalStorage

⸻

💡 Fonctionnalités Futures
*   PNJ spécialisés (Bûcherons, Mineurs, Gardes).
*   Pièges et fortifications avancées (en pierre, etc.).
*   Nouveaux types d'ennemis et des Boss.
*   Système de progression du joueur (XP, niveaux, compétences).
*   Biomes variés avec des ressources uniques.