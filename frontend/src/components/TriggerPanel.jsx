// components/TriggerPanel.jsx
// The control panel at the top of the page.
// Keeps itself simple — it doesn't know about the backend, health checks,
// or SSE streams. It just tells App.tsx "the user clicked Run" via onRun().
//
// Props:
//   onRun      – called immediately when the user clicks the button
//   isRunning  – true while the agent loop is active (disables the button)

import React from 'react';

export function TriggerPanel({ onRun, isRunning }) {
  return (
    <div style={styles.container}>

      {/* ── Title ── */}
      <h1 style={styles.heading}>GitHub Trending Agent</h1>

      {/* ── Subtitle ── */}
      <p style={styles.subtitle}>
        Finds best React &amp; Node.js repos this week &nbsp;·&nbsp; Claude analyzes each one &nbsp;·&nbsp; Sends to WhatsApp
      </p>

      {/* ── Run button ── */}
      <button
        onClick={onRun}
        disabled={isRunning}
        style={{
          ...styles.button,
          // Gray out the button while the agent is running
          backgroundColor: isRunning ? '#555' : '#0066ff',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          opacity: isRunning ? 0.75 : 1,
        }}
      >
        {/* Show a spinner text when running, and the normal label otherwise */}
        {isRunning ? '⏳ Running...' : '▶ Run Agent'}
      </button>

      {/* ── Helper text below button ── */}
      <p style={styles.hint}>
        Takes ~30 seconds · Claude calls GitHub tools to research repos
      </p>

    </div>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────
const styles = {
  container: {
    textAlign: 'center',
    padding: '2rem 1.5rem 1.5rem',
    borderBottom: '1px solid #2a2a2a',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 10px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#aaaaaa',
    margin: '0 auto 20px',
    maxWidth: '480px',
    lineHeight: '1.5',
  },
  button: {
    padding: '10px 32px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.2s, opacity 0.2s',
  },
  hint: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#666666',
  },
};

export default TriggerPanel;
