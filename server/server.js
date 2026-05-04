require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]); // Use Google DNS for MongoDB Atlas SRV resolution
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/room");
const executeRoutes = require("./routes/execute");
const aiRoutes = require("./routes/ai");
const Room = require("./models/Room");

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collab-editor")
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../client")));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../client/index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../client/auth.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "../client/dashboard.html")));
app.get("/room/:roomId", (req, res) => res.sendFile(path.join(__dirname, "../client/editor.html")));

const server = http.createServer(app);
const io = new Server(server);

let roomUsers = {};

io.on("connection", (socket) => {
    socket.on("join-room", async ({ roomId, username }) => {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username || "Anonymous";
        socket.cursorColor = '#' + Math.floor(Math.random()*16777215).toString(16).padEnd(6, '8');

        let room = await Room.findOne({ roomId });
        if (!room) {
            room = await Room.create({ roomId, name: "Untitled Room", files: [{ name: "main.js", content: "\n" }] });
        }

        if (!roomUsers[roomId]) roomUsers[roomId] = [];
        roomUsers[roomId].push({ username: socket.username, color: socket.cursorColor, id: socket.id });

        let filesObj = {};
        if (room.files && room.files.length > 0) {
            for (let file of room.files) {
                if (file.name) filesObj[file.name] = file.content;
            }
        } else {
            filesObj["main.js"] = "\n";
        }

        socket.emit("room-state", { files: filesObj, language: room.language, aiChatHistory: room.aiChatHistory || [] });
        
        io.to(roomId).emit("user-count", roomUsers[roomId].length);
        io.to(roomId).emit("users-list", roomUsers[roomId].map(u => u.username));
        socket.to(roomId).emit("user-joined", `${socket.username} joined the room`);

        socket.on("code-change", async ({ filename, content }) => {
            let r = await Room.findOne({ roomId });
            if (r) {
                if(!r.files) r.files = [];
                let fileItem = r.files.find(f => f.name === filename);
                if (fileItem) fileItem.content = content;
                else r.files.push({ name: filename, content: content });
                await r.save();
                socket.to(roomId).emit("code-change", { filename, content });
            }
        });

        socket.on("file-created", async (filename) => {
            let r = await Room.findOne({ roomId });
            if (r) {
                if(!r.files) r.files = [];
                if (!r.files.find(f => f.name === filename)) {
                    r.files.push({ name: filename, content: "\n" });
                    await r.save();
                    io.to(roomId).emit("file-created", filename); // Broadcast creation
                }
            }
        });

        socket.on("file-renamed", async ({ oldName, newName }) => {
            if (!oldName || !newName || oldName === newName) return;
            let r = await Room.findOne({ roomId });
            if (r) {
                // Check new name doesn't already exist
                if (r.files.find(f => f.name === newName)) return;
                let fileItem = r.files.find(f => f.name === oldName);
                if (fileItem) {
                    fileItem.name = newName;
                    await r.save();
                    io.to(roomId).emit("file-renamed", { oldName, newName });
                }
            }
        });

        socket.on("file-deleted", async (filename) => {
            if (!filename) return;
            let r = await Room.findOne({ roomId });
            if (r) {
                r.files = r.files.filter(f => f.name !== filename);
                if (r.files.length === 0) {
                    r.files.push({ name: "main.js", content: "\n" });
                }
                await r.save();
                io.to(roomId).emit("file-deleted", filename);
            }
        });

        socket.on("cursor-change", (data) => {
            socket.to(roomId).volatile.emit("cursor-change", { 
                filename: data.filename,
                position: data.position, 
                username: socket.username, 
                color: socket.cursorColor,
                id: socket.id
            });
        });

        socket.on("language-change", async (ext) => {
            await Room.findOneAndUpdate({ roomId }, { language: ext });
            socket.to(roomId).emit("language-change", ext);
        });

        socket.on("console-output", (output) => {
            socket.to(roomId).emit("console-output", output);
        });

        // WebRTC Signaling Events
        socket.on("join-video", () => {
            socket.to(roomId).emit("user-joined-video", socket.id);
        });

        socket.on("video-offer", ({ offer, to }) => {
            io.to(to).emit("video-offer", { offer, from: socket.id });
        });

        socket.on("video-answer", ({ answer, to }) => {
            io.to(to).emit("video-answer", { answer, from: socket.id });
        });

        socket.on("new-ice-candidate", ({ candidate, to }) => {
            io.to(to).emit("new-ice-candidate", { candidate, from: socket.id });
        });

        // AI Chat — Shared per-room
        socket.on("ai-chat-message", async ({ message, code, language }) => {
            const axios = require("axios");
            const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
            const apiKey = process.env.GEMINI_API_KEY;

            // Store user message in DB and broadcast
            const userMsg = { role: "user", content: message, username: socket.username, timestamp: new Date() };
            let r = await Room.findOne({ roomId });
            if (r) {
                if (!r.aiChatHistory) r.aiChatHistory = [];
                r.aiChatHistory.push(userMsg);
                await r.save();
            }
            io.to(roomId).emit("ai-chat-message", userMsg);

            if (!apiKey) {
                const errMsg = { role: "model", content: "⚠️ GEMINI_API_KEY is not configured on the server.", username: "AI", timestamp: new Date() };
                io.to(roomId).emit("ai-chat-response", errMsg);
                return;
            }

            // Build Gemini request with history
            const systemContext = "You are an expert coding assistant inside CollabCode, a real-time collaborative editor. Keep responses concise with Markdown formatting. Wrap code in fenced code blocks with language identifiers. Be friendly and precise.";
            const contents = [];
            const history = (r ? r.aiChatHistory : []).filter(m => m.role === "user" || m.role === "model");

            // Build alternating user/model turns for Gemini
            history.forEach((msg, i) => {
                if (msg === userMsg) return; // skip current one, we add it below
                contents.push({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: i === 0 ? systemContext + "\n\n" + msg.content : msg.content }]
                });
            });

            let userText = contents.length === 0 ? systemContext + "\n\n" : "";
            if (code && code.trim()) {
                userText += `The user is editing a **${language || "unknown"}** file:\n\n\`\`\`${language || ""}\n${code}\n\`\`\`\n\n`;
            }
            userText += message;
            contents.push({ role: "user", parts: [{ text: userText }] });

            try {
                const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
                    contents,
                    generationConfig: { temperature: 0.7, maxOutputTokens: 4096, topP: 0.95, topK: 40 }
                }, { headers: { "Content-Type": "application/json" }, timeout: 30000 });

                const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
                const botMsg = { role: "model", content: reply, username: "AI", timestamp: new Date() };

                r = await Room.findOne({ roomId });
                if (r) {
                    r.aiChatHistory.push(botMsg);
                    await r.save();
                }
                io.to(roomId).emit("ai-chat-response", botMsg);
            } catch (err) {
                console.error("AI Socket Error:", err.response?.data || err.message);
                const errContent = err.response?.status === 429 ? "⚠️ Rate limit exceeded. Please wait and try again." : "⚠️ Failed to get AI response.";
                const errMsg = { role: "model", content: errContent, username: "AI", timestamp: new Date() };
                io.to(roomId).emit("ai-chat-response", errMsg);
            }
        });
    });

    socket.on("disconnect", () => {
        const roomId = socket.roomId;
        if (roomId && roomUsers[roomId]) {
            roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socket.id);
            io.to(roomId).emit("user-count", roomUsers[roomId].length);
            io.to(roomId).emit("users-list", roomUsers[roomId].map(u => u.username));
            io.to(roomId).emit("cursor-remove", socket.id);
            socket.to(roomId).emit("user-left", `${socket.username} left the room`);

            if (roomUsers[roomId].length === 0) {
                delete roomUsers[roomId];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});