// components/AgentLog.jsx
// Shows a live, scrolling terminal-style log of what the agent is doing.
//
// Props:
//   logs – array of plain strings, one per log line
//           (App.tsx converts backend events to strings before passing them here)
//
// Behavior:
//   - Returns null (renders nothing) when logs is empty
//   - Auto-scrolls to the newest line whenever a new log is added

import React, { useEffect, useRef } from 'react';

export function AgentLog({ logs }) {
  // Ref attached to the very bottom of the scroll container.
  // We scroll it into view every time a new log line arrives.
  const bottomRef = useRef(null);

  // Auto-scroll whenever the logs array changes (i.e. a new line was added)
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Render nothing when there are no logs yet
  if (logs.length === 0) return null;

  return (
    <div style={styles.wrapper}>

      {/* Muted label above the log box */}
      <p style={styles.label}>Agent activity</p>

      {/* Scrollable log container */}
      <div style={styles.scrollBox}>
        {logs.map((line, index) => (
          <div key={index} style={{ ...styles.line, color: getLineColor(line) }}>
            {line}
          </div>
        ))}

        {/* Invisible anchor at the bottom — scrollIntoView targets this */}
        <div ref={bottomRef} />
      </div>

    </div>
  );
}

// ── Color logic ────────────────────────────────────────────────────────────────
// Gives each log line a color based on its content so the log is easy to scan.
function getLineColor(line) {
  if (line.includes('Tool') || line.includes('🔧')) return '#61afef'; // blue  — tool calls
  if (line.includes('error') || line.includes('⚠️'))  return '#e06c75'; // red   — errors / warnings
  if (line.includes('✅') || line.includes('✔️'))      return '#98c379'; // green — successes
  return '#abb2bf';                                                       // gray  — general logs
}

// ── Inline styles ──────────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    padding: '0 1rem 1rem',
  },
  label: {
    fontSize: '11px',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 6px',
  },
  scrollBox: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    padding: '12px',
    maxHeight: '220px',
    overflowY: 'auto',
    marginBottom: '1rem',
  },
  line: {
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '2px 0',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
};

export default AgentLog;
