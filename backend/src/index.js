// src/index.js
// Express server — the entry point that wires the agent loop to the frontend.
//
// Endpoints:
//   GET  /health          — quick sanity check, returns { status, timestamp }
//   POST /api/agent/run   — runs the agent and streams live events via SSE
//
// SSE (Server-Sent Events) primer:
//   The browser opens a fetch() POST to /api/agent/run and reads the response
//   body as a stream. The server writes "data: <json>\n\n" lines as the agent
//   progresses. A final "data: [DONE]\n\n" signals the stream is finished.

// Load .env FIRST so every require() below can read process.env values
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { runAgentLoop } = require('./agent/loop');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// Only allow requests from the Vite dev server — tightens security slightly
app.use(cors({ origin: 'http://localhost:5173' }));

// Parse JSON bodies (used by Express, not strictly needed for SSE but good practice)
app.use(express.json());

// ── Endpoint 1: GET /health ───────────────────────────────────────────────────
// The frontend calls this first to confirm the backend is reachable before
// attempting the full agent run.
app.get('/health', (req, res) => {
  console.log('[Server] Health check called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Endpoint 2: POST /api/agent/run ──────────────────────────────────────────
// Runs the full agent loop and streams every log update to the browser via SSE.
// The frontend uses fetch() + ReadableStream to read the events as they arrive.
app.post('/api/agent/run', async (req, res) => {
  console.log('[Server] Agent run started');

  // Tell the browser this is a streaming SSE response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Send headers immediately so the stream opens right away

  // emit(data) — helper that serialises one event and writes it to the stream.
  // SSE protocol: every message must be "data: <payload>\n\n"
  function emit(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    // Run the agent — it calls emit() for every log, tool call, and result
    await runAgentLoop(emit);
    console.log('[Server] Agent run complete');
  } catch (error) {
    // Send the error to the frontend so it can display it, then fall through
    console.error('[Server] Agent run error:', error.message);
    emit({ type: 'error', message: error.message });
  }

  // Always signal the end of the stream so the frontend knows to stop reading
  res.write('data: [DONE]\n\n');
  res.end();
});

// ── Start the server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[Server] Backend running on http://localhost:${PORT}`);
});
