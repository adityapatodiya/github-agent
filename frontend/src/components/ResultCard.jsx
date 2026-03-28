// components/ResultCard.jsx
// Displays one analyzed GitHub repo as a card.
// Rendered once per repo that Claude selects during the agent run.
//
// Props (repo object):
//   full_name      – e.g. "facebook/react"
//   url            – full GitHub URL
//   stars          – number (may be undefined if parsing failed)
//   description    – plain-text summary from Claude
//   why_interesting – why Claude picked this repo

import React from 'react';

export function ResultCard({ repo }) {
  return (
    <div style={styles.card}>

      {/* ── Header row: repo name link + star badge ── */}
      <div style={styles.header}>
        <a href={repo.url} target="_blank" rel="noreferrer" style={styles.repoLink}>
          {repo.full_name}
        </a>
        {repo.stars != null && (
          <span style={styles.stars}>
            ⭐ {repo.stars.toLocaleString()}
          </span>
        )}
      </div>

      {/* ── Description ── */}
      {repo.description && (
        <p style={styles.description}>{repo.description}</p>
      )}

      {/* ── Why interesting ── */}
      {repo.why_interesting && (
        <p style={styles.why}>
          💡 Why trending: {repo.why_interesting}
        </p>
      )}

      {/* ── CTA button ── */}
      <a
        href={repo.url}
        target="_blank"
        rel="noreferrer"
        style={styles.button}
      >
        View on GitHub →
      </a>

    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────────
const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px',
  },
  repoLink: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#185FA5',
    textDecoration: 'none',
  },
  stars: {
    fontSize: '13px',
    color: '#888888',
  },
  description: {
    fontSize: '14px',
    color: '#333333',
    lineHeight: '1.6',
    margin: '0 0 8px',
  },
  why: {
    fontSize: '13px',
    color: '#666666',
    fontStyle: 'italic',
    margin: '0 0 14px',
    lineHeight: '1.5',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#25D366',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
  },
};

export default ResultCard;
