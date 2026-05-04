const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { language, sourceCode } = req.body;
        
        // Map our language to Judge0 language IDs
        const langMap = {
            "javascript": 102,
            "python": 113,
            "c": 103,
            "cpp": 105,
            "java": 91
        };
        const langId = langMap[language] || 102;

        const response = await axios.post("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
            language_id: langId,
            source_code: sourceCode
        });

        const data = response.data;
        
        const output = data.stdout || "";
        const compileErr = data.compile_output || data.stderr || "";
        const errorDescription = (data.status && data.status.id > 3) ? `[${data.status.description}] ` : "";
        
        if (data.status && data.status.id > 3 && !output && !compileErr) {
            res.json({ error: errorDescription + "Execution failed without output." });
        } else {
            const combinedOutput = compileErr ? errorDescription + compileErr + '\n' + output : errorDescription + output;
            res.json({ run: { output: combinedOutput.trim() }, compile: { output: "" } });
        }
    } catch (err) {
        const apiError = err.response && err.response.data ? err.response.data : err.message;
        console.error("Execution error:", apiError);
        res.status(500).json({ error: `Code execution service error: ${apiError}` });
    }
});

module.exports = router;
