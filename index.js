require('dotenv').config();
const express = require('express');
const axios = require('axios');
const readline = require('readline-sync');

const app = express();
const PORT = 3000;

const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-Nemo-Instruct-2407";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Function to generate app ideas
const generateIdeas = async (userQuery) => {
    console.log("Please wait, we are generating an idea..............");
    try {
        const response = await axios.post(
            HUGGINGFACE_API_URL,
            {
                inputs: `Generate 3 unique app ideas for this query: \"${userQuery}\"`,
            },
            {
                headers: {
                    "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const ideasText = response.data?.[0]?.generated_text || "";
        const ideas = ideasText
            .split("\n")
            .filter((line) => line.trim().startsWith("1.") || line.trim().startsWith("2.") || line.trim().startsWith("3."))
            .map((idea) => idea.trim());

        return ideas.length ? ideas : ["Error: No ideas were generated. Please try again."];
    } catch (error) {
        console.error("Error fetching ideas from API:", error.message);
        return ["Error: Unable to fetch ideas. Please try again later."];
    }
};

const rankIntents = (ideas) => {
    return ideas.map((idea, index) => {
        const relevance = Math.floor(Math.random() * 5) + 1;
        const impact = Math.floor(Math.random() * 5) + 1;
        const feasibility = Math.floor(Math.random() * 5) + 1;
        const priorityScore = (relevance + impact + feasibility) / 3;

        return {
            idea,
            relevance,
            impact,
            feasibility,
            priorityScore,
        };
    }).sort((a, b) => a.priorityScore - b.priorityScore); // Sort by priority score
};

// Function to expand an idea
const expandIdea = async (idea) => {
    try {
        const response = await axios.post(
            HUGGINGFACE_API_URL,
            {
                inputs: `Expand on this app idea: \"${idea}\". Suggest unique features, engagement strategies, and monetization ideas.`,
            },
            {
                headers: {
                    "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data?.[0]?.generated_text || "Error: Unable to expand idea. Please try again.";
    } catch (error) {
        console.error("Error expanding idea:", error.message);
        return "Error: Unable to expand idea. Please try again.";
    }
};

app.get('/', async (req, res) => {
    console.log("Welcome to the Chatbot!");

    const userQuery = "What new app should I build?";
    const ideas = await generateIdeas(userQuery);

    if (ideas.length === 1 && ideas[0].startsWith("Error")) {
        return res.send({ message: ideas[0] });
    }

    console.log("\nHere are 3 unique app ideas:");
    ideas.forEach((idea, index) => console.log(` ${idea}`));

    const rankedIntents = rankIntents(ideas);

    console.log("\nRanked ideas based on priority:");
    rankedIntents.forEach((intent, index) => {
        const cleanedIdea = intent.idea.replace(/^\d+\.\s*/, "").replace(/\*+/g, "");
        console.log(`${index + 1}. ${cleanedIdea}`); // Display proper index (1-based)
        console.log(`   Relevance: ${intent.relevance}, Impact: ${intent.impact}, Feasibility: ${intent.feasibility}`);
        console.log(`   Priority Score: ${intent.priorityScore.toFixed(2)}`);
    });
    

    const userSelection = readline.question("Select an idea by typing its number or request an explanation (e.g. 1): ");

    if (userSelection.startsWith("explain")) {
        const explainIndex = parseInt(userSelection.split(" ")[1]) - 1;

        if (explainIndex >= 0 && explainIndex < rankedIntents.length) {
            const explanation = `Idea: ${rankedIntents[explainIndex].idea}` +
                `Relevance: ${rankedIntents[explainIndex].relevance} (How closely it aligns with the query)` +
                `Impact: ${rankedIntents[explainIndex].impact} (Expected ROI or significance)` +
                `Feasibility: ${rankedIntents[explainIndex].feasibility} (Ease of implementation)`;

            return res.send({ explanation });
        } else {
            return res.send("Invalid explanation request. Please restart and try again.");
        }
    }

    const selectedIndex = parseInt(userSelection) - 1;

    if (selectedIndex >= 0 && selectedIndex < rankedIntents.length) {
        const selectedIdea = rankedIntents[selectedIndex].idea;
        const expandedSuggestion = await expandIdea(selectedIdea);

        console.log(selectedIdea, expandedSuggestion, "Thank you for using our chatbot! We hope this idea inspires you!")
        return res.send({
            selectedIdea,
            expandedSuggestion,
            thankYouNote: "Thank you for using our chatbot! We hope this idea inspires you!",
        });
    } else {
        return res.send("Invalid selection. Please restart and try again.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
