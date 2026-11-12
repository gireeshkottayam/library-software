import React, { useState, useEffect } from 'react'
import { KeyRound, Copy, CheckCircle } from 'lucide-react'

export default function Activation({ onActivate }) {
  const [hwid, setHwid] = useState('')
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.api.checkLicense().then(res => {
      setHwid(res.hwid)
      setLoading(false)
    })
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(hwid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!key.trim()) return
    setError('')
    const res = await window.api.activateLicense(key.trim())
    if (res.success) {
      onActivate()
    } else {
      setError(res.message || 'Invalid License Key')
    }
  }

  if (loading) return <div className="login-page">Loading...</div>

  return (
    <div className="login-page" style={{ paddingTop: 'var(--titlebar-h)' }}>
      <div className="login-card" style={{ width: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <KeyRound size={32} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Software Activation</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Please enter a valid serial key to activate Public Library Kooroppada management software.
          </p>
        </div>

        <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Your Hardware ID:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" disabled value={hwid} style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
            <button className="btn btn--secondary btn--icon" onClick={handleCopy} title="Copy HWID">
              {copied ? <CheckCircle size={16} color="var(--green)" /> : <Copy size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 8 }}>
            Provide this Hardware ID to the administrator to receive your Serial Key. The key is permanently tied to this machine.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255, 60, 60, 0.1)', color: 'var(--red)', padding: 12, borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 14, fontWeight: 500, border: '1px solid rgba(255, 60, 60, 0.2)' }}>{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Serial Key</label>
            <textarea 
              className="form-input" 
              value={key} 
              onChange={e => setKey(e.target.value)} 
              placeholder="Paste your base64 serial key here..." 
              rows={4}
              style={{ fontFamily: 'monospace', resize: 'none' }}
              required 
            />
          </div>
          
          <button type="submit" className="btn btn--primary" style={{ width: '100%', height: 44, marginTop: 10 }}>
            Activate Software
          </button>
        </form>
      </div>
    </div>
  )
}
