
import axios from 'axios';

// The base URL of the backend Express server (matches PORT in backend/.env)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function startAgentStream(onEvent, onError, onDone) {
  console.log('[API] Opening SSE stream to', `${API_BASE}/api/agent/run`);

  // AbortController lets us cancel the fetch from outside (e.g. user closes the tab)
  const controller = new AbortController();

  // We use an async IIFE so we can use await inside without blocking the caller
  (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // empty body — the agent needs no input from the client
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      // response.body is a ReadableStream of Uint8Array chunks.
      // We wrap it in a TextDecoder reader to get strings.
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = ''; // accumulates partial lines between chunks

      // Keep reading until the stream closes
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the binary chunk and append to our line buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by "\n\n".
        // Split on double-newline so we process one complete message at a time.
        const parts = buffer.split('\n\n');

        // The last element may be an incomplete message — keep it in the buffer
        buffer = parts.pop();

        for (const part of parts) {
          // Each SSE message looks like: "data: <payload>"
          const line = part.trim();
          if (!line.startsWith('data:')) continue;

          const raw = line.slice(5).trim(); // strip the "data: " prefix

          // "[DONE]" is the sentinel the backend sends when the agent finishes
          if (raw === '[DONE]') {
            console.log('[API] Stream finished ([DONE] received)');
            if (onDone) onDone({});
            return; // exit the async IIFE
          }

          // Parse the JSON payload and fire the caller's event callback
          try {
            const data = JSON.parse(raw);
            console.log('[API] Event:', data.type, '—', (data.message || '').substring(0, 80));
            onEvent(data);

            // Also treat a "done" type event as the end signal
            if (data.type === 'done' || data.type === 'error') {
              if (onDone) onDone(data);
              return;
            }
          } catch (parseError) {
            console.error('[API] Failed to parse event JSON:', parseError.message, '| raw:', raw);
          }
        }
      }
    } catch (error) {
      // AbortError just means the user cancelled — not a real error
      if (error.name === 'AbortError') {
        console.log('[API] Stream aborted by caller');
        return;
      }
      console.error('[API] Stream error:', error.message);
      if (onError) {
        onError(
          'Could not connect to the agent backend. ' +
          'Make sure the backend is running on port 3001.'
        );
      }
    }
  })();

  // Return the AbortController so App.tsx can cancel the stream if needed
  return controller;
}

// ─── checkHealth ──────────────────────────────────────────────────────────────
//
// Sends a quick GET /health request to verify the backend is reachable.
// Throws an Error (with a friendly message) if it can't connect.
export async function checkHealth() {
  console.log('[API] Checking backend health...');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('[API] Health check OK:', response.data.message);
    return response.data;
  } catch (error) {
    console.error('[API] Health check failed:', error.message);
    throw new Error(
      'Backend server is not reachable on port 3001. ' +
      'Run: cd backend && node src/index.js'
    );
  }
}
