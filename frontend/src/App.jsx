// App.jsx
// Root React component for the GitHub Trending Agent frontend.
//
// Responsibilities:
//   - Check whether the backend is reachable when the page loads
//   - Start the agent when the user clicks "Run Agent"
//   - Show live logs as Claude researches repositories
//   - Show result cards for the repos Claude selects

import { useEffect, useState } from 'react'
import TriggerPanel from './components/TriggerPanel'
import AgentLog from './components/AgentLog'
import ResultCard from './components/ResultCard'
import { startAgentStream, checkHealth } from './api'

export default function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [repos, setRepos] = useState([])
  const [error, setError] = useState(null)
  const [backendOk, setBackendOk] = useState(false)

  // Check backend availability once when the component mounts.
  useEffect(() => {
    async function verifyBackend() {
      console.log('[App] Checking backend on initial page load...')

      try {
        await checkHealth()
        console.log('[App] Backend is reachable')
        setBackendOk(true)
      } catch (err) {
        const message = err.message || 'Failed to connect to backend'
        console.error('[App] Backend health check failed:', message)
        setBackendOk(false)
        setError(message)
      }
    }

    verifyBackend()
  }, [])

  // Starts one full agent run and listens for streamed updates.
  function handleRun() {
    console.log('[App] Run button clicked')

    setIsRunning(true)
    setLogs([])
    setRepos([])
    setError(null)

    startAgentStream(
      // onEvent(data)
      (data) => {
        console.log('[App] Stream event received:', data.type)

        if (
          data.type === 'log' ||
          data.type === 'tool_call' ||
          data.type === 'tool_result' ||
          data.type === 'whatsapp_sent'
        ) {
          if (data.message) {
            setLogs((prev) => [...prev, data.message])
          }
        }

        if (data.type === 'result' && data.repo) {
          setRepos((prev) => [...prev, data.repo])
        }

        if (data.type === 'error') {
          setError(data.message)
        }
      },

      // onError(msg)
      (msg) => {
        console.error('[App] Stream error:', msg)
        setError(msg)
        setIsRunning(false)
      },

      // onDone()
      () => {
        console.log('[App] Stream complete')
        setIsRunning(false)
      }
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <TriggerPanel onRun={handleRun} isRunning={isRunning} />

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {!backendOk && !error && (
          <div style={styles.warningBox}>
            Backend not detected on port 3001.
            <br />
            Run: cd backend && node src/index.js
          </div>
        )}

        <AgentLog logs={logs} />

        {repos.length > 0 && (
          <div style={styles.resultsSection}>
            <h2 style={styles.heading}>Found {repos.length} trending repos</h2>
            {repos.map((repo) => (
              <ResultCard key={repo.full_name || repo.url} repo={repo} />
            ))}
          </div>
        )}

        {isRunning && repos.length === 0 && (
          <p style={styles.loadingText}>Claude is researching GitHub repos...</p>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 1rem',
    backgroundColor: '#f7f8fa',
  },
  container: {
    width: '100%',
    maxWidth: '720px',
  },
  errorBox: {
    backgroundColor: '#ffe5e5',
    color: '#a61b1b',
    border: '1px solid #f3b5b5',
    borderRadius: '10px',
    padding: '0.9rem 1rem',
    marginBottom: '1rem',
    fontSize: '14px',
  },
  warningBox: {
    backgroundColor: '#fff6d8',
    color: '#7a5d00',
    border: '1px solid #ead27a',
    borderRadius: '10px',
    padding: '0.9rem 1rem',
    marginBottom: '1rem',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  resultsSection: {
    marginTop: '0.5rem',
  },
  heading: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1d1d1f',
    margin: '0 0 1rem',
  },
  loadingText: {
    color: '#666666',
    fontSize: '14px',
    marginTop: '0.5rem',
  },
}
