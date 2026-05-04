const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

router.post("/chat", async (req, res) => {
    try {
        const { message, code, language, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server. Add it to your .env file." });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Message cannot be empty." });
        }

        // Build conversation contents for Gemini
        const contents = [];

        // System instruction via the first user turn context
        const systemContext = [
            "You are an expert coding assistant embedded inside a real-time collaborative code editor called CollabCode.",
            "Your role is to help developers with code explanations, debugging, refactoring, suggestions, and answering programming questions.",
            "Keep responses concise and well-formatted using Markdown.",
            "When providing code, always wrap it in fenced code blocks with the appropriate language identifier.",
            "Be friendly, precise, and helpful."
        ].join(" ");

        // Add prior conversation history
        if (history && Array.isArray(history)) {
            history.forEach((msg, index) => {
                contents.push({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: index === 0 ? systemContext + "\n\n" + msg.content : msg.content }]
                });
            });
        }

        // Build the current user message with optional code context
        let userMessage = "";
        if (contents.length === 0) {
            userMessage += systemContext + "\n\n";
        }

        if (code && code.trim()) {
            userMessage += `The user is currently editing a **${language || "unknown"}** file. Here is their current code:\n\n\`\`\`${language || ""}\n${code}\n\`\`\`\n\n`;
        }

        userMessage += message;

        contents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
                topP: 0.95,
                topK: 40
            }
        }, {
            headers: { "Content-Type": "application/json" },
            timeout: 30000
        });

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            return res.status(500).json({ error: "AI returned an empty response. Please try again." });
        }

        res.json({ reply });

    } catch (err) {
        console.error("AI Chat Error:", err.response?.data || err.message);

        if (err.response?.status === 429) {
            return res.status(429).json({ error: "Rate limit exceeded. Please wait a moment and try again." });
        }
        if (err.response?.status === 400) {
            return res.status(400).json({ error: "Invalid request to AI service. Try simplifying your message." });
        }

        res.status(500).json({ error: "Failed to get AI response. Please check your API key and try again." });
    }
});

module.exports = router;
