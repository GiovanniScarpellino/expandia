const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

app.post('/generate-quest', async (req, res) => {
    const { gameState } = req.body;

    const prompt = `
        Vous êtes un maître de jeu pour un jeu de survie et d'exploration.
        Le joueur a l'état de jeu suivant : ${JSON.stringify(gameState)}.

        Générez une quête courte et une histoire d'une phrase.
        La quête DOIT être l'une des suivantes :
        - "collect_resource" (avec les propriétés "resource": "wood" ou "stone", et "target": un nombre)
        - "unlock_tile" (avec la propriété "target": 1)
        - "defeat_enemy" (avec la propriété "target": un nombre)

        La réponse DOIT être un objet JSON valide, et uniquement l'objet JSON, avec la structure suivante :
        {
          "story": "Une courte histoire pour la quête.",
          "objective": { "type": "...", "resource": "...", "target": ... },
          "reward": { "resource": "wood" ou "stone", "amount": ... }
        }
    `;

    try {
        console.log("Serveur Express: Requête à Ollama...");
        const response = await axios.post(OLLAMA_API_URL, {
            model: "mistral",
            prompt: prompt,
            stream: false,
            format: "json"
        });

        const questJson = JSON.parse(response.data.response);
        console.log("Serveur Express: Quête reçue d'Ollama :", questJson);
        res.json(questJson);

    } catch (error) {
        console.error("Serveur Express: Erreur de communication avec Ollama:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Impossible de générer une quête depuis Ollama." });
    }
});

app.listen(port, () => {
    console.log(`Serveur de quêtes Express démarré sur http://localhost:${port}`);
});
