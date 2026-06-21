import express from "express";
import { spawn } from "child_process";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Start the existing MCP server as a background process
const mcpProcess = spawn("node", ["dist/index.js"], {
  env: { ...process.env },
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";

mcpProcess.stdout.on("data", (data) => {
  buffer += data.toString();
});

mcpProcess.stderr.on("data", (data) => {
  console.error("MCP stderr:", data.toString());
});

// Health check endpoint - lets you confirm it's alive in a browser
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Apollo MCP HTTP wrapper is running" });
});

// Main MCP endpoint - this is the URL you'll give to Kablewy
app.post("/mcp", (req, res) => {
  const request = JSON.stringify(req.body) + "\n";
  buffer = "";

  mcpProcess.stdin.write(request);

  const checkInterval = setInterval(() => {
    if (buffer.trim().length > 0) {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      try {
        const response = JSON.parse(buffer.trim());
        res.json(response);
      } catch (e) {
        res.status(500).json({ error: "Failed to parse MCP response" });
      }
    }
  }, 100);

  const timeout = setTimeout(() => {
    clearInterval(checkInterval);
    res.status(504).json({ error: "MCP server timeout" });
  }, 30000);
});

app.listen(PORT, () => {
  console.log(`Apollo MCP HTTP wrapper listening on port ${PORT}`);
});
