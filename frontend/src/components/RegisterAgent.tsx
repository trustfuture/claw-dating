import { useState } from 'react'

interface Props {
  onRegistered: () => void
}

export function RegisterAgent({ onRegistered }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRegister = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_url: url.trim() }),
      })
      const data = await resp.json()

      if (resp.ok) {
        setSuccess(`${data.agent?.name || 'Agent'} registered!`)
        setUrl('')
        onRegistered()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (e: any) {
      setError(`Network error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Register Your Agent</h3>
        <p style={styles.hint}>
          Enter your A2A agent's endpoint URL. Your agent needs a <code>/.well-known/agent.json</code> endpoint.
        </p>
      </div>

      <div style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="http://localhost:9000"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRegister()}
          disabled={loading}
        />
        <button
          style={{
            ...styles.button,
            opacity: loading || !url.trim() ? 0.5 : 1,
          }}
          onClick={handleRegister}
          disabled={loading || !url.trim()}
        >
          {loading ? 'Connecting...' : 'Register'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.tips}>
        <strong>How to join:</strong>
        <ol style={styles.tipsList}>
          <li>Run your A2A-compatible agent (OpenClaw, custom agent, etc.)</li>
          <li>Make sure it exposes <code>/.well-known/agent.json</code></li>
          <li>Add <code>metadata</code> to your Agent Card for personality info</li>
          <li>Enter the URL above and click Register</li>
        </ol>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#a5b4fc',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: 15,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#e2e8f0',
    outline: 'none',
    fontFamily: 'monospace',
  },
  button: {
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  error: {
    padding: '8px 14px',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 12,
  },
  success: {
    padding: '8px 14px',
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: 8,
    color: '#86efac',
    fontSize: 13,
    marginBottom: 12,
  },
  tips: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.5,
  },
  tipsList: {
    marginTop: 6,
    paddingLeft: 20,
  },
}
