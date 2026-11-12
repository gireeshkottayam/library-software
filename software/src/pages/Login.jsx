import React, { useState } from 'react'
import { useAuth } from '../App.jsx'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const [settings, setSettings] = useState({})

  React.useEffect(() => {
    window.api.getAllSettings().then(setSettings)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Please enter username and password'); return }
    setLoading(true); setError('')
    const res = await window.api.login(form.username, form.password)
    setLoading(false)
    if (res.success) {
      login(res.user)
      navigate('/')
    } else {
      setError(res.message || 'Invalid credentials')
    }
  }

  const [view, setView] = useState('login') // login, reset-code, reset-form
  const [resetData, setResetData] = useState({ code: '', user: '', pwd: '', confirm: '' })
  const [resetError, setResetError] = useState('')

  async function handleResetSubmit(e) {
    e.preventDefault()
    if (view === 'reset-code') {
      if (!resetData.code) return
      setView('reset-form')
    } else {
      if (!resetData.user || !resetData.pwd) { setResetError('Enter all fields'); return }
      if (resetData.pwd !== resetData.confirm) { setResetError('Passwords do not match'); return }
      
      const res = await window.api.resetAdminCredentials(resetData.code, resetData.user, resetData.pwd)
      if (res.success) {
        alert('Admin credentials reset successfully! Please login.')
        setView('login')
        setResetData({ code: '', user: '', pwd: '', confirm: '' })
      } else {
        setResetError(res.message)
      }
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#1e293b', 
      overflow: 'hidden',
      backgroundImage: settings.login_bg ? `url(${settings.login_bg})` : 'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-dark) 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative'
    }}>
      {/* Overlay to ensure text readability */}
      {settings.login_bg && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 50%, rgba(15,23,42,0.5) 100%)' }} />}

      {/* Left Side: Brand Info */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-end', 
        padding: '60px',
        color: '#fff',
        zIndex: 10
      }}>
        <div style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-1px', lineHeight: '1.1', marginBottom: '15px' }}>
          {settings.library_name || 'Public Library Kooroppada'}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 500, opacity: 0.9, letterSpacing: '0.5px', lineHeight: '1.4', marginBottom: '20px' }}>
          {settings.library_address || 'Kooroppada, Kerala'} {settings.library_reg_no ? `• Reg No: ${settings.library_reg_no}` : ''}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.7, maxWidth: '400px', lineHeight: '1.6', fontStyle: 'italic' }}>
          Empowering our community through knowledge, culture, and lifelong learning since the foundation of our institution.
        </div>
      </div>

      {/* Right Side: Centered Login Box */}
      <div style={{ 
        width: '550px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {view === 'login' ? (
            <>
              <div style={{ marginBottom: '35px' }}>
                <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', lineHeight: '1.2' }}>Welcome Back</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Please sign in to access the library system.</div>
              </div>

              {error && <div className="login-error" style={{ marginBottom: 20 }}>⚠ {error}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <div className="search-bar" style={{height: 45, borderRadius: '8px', border: '1px solid var(--border)'}}>
                    <User size={18} className="search-icon" color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={form.username}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                      autoFocus
                      style={{ fontSize: '15px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="search-bar" style={{height: 45, borderRadius: '8px', border: '1px solid var(--border)'}}>
                    <Lock size={18} className="search-icon" color="var(--text-muted)" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      style={{ fontSize: '15px' }}
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0 10px' }}>
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn--primary" disabled={loading} style={{ marginTop: 15, justifyContent: 'center', height: 45, fontSize: '16px', borderRadius: '8px' }}>
                  {loading ? 'Authenticating…' : 'Sign In'}
                </button>
              </form>

              <button 
                onClick={() => setView('reset-code')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-light)', fontSize: 13, marginTop: 20, cursor: 'pointer', fontWeight: 600 }}>
                Reset Admin Credentials?
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '30px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                  {view === 'reset-code' ? 'Security Verification' : 'Reset Admin Account'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {view === 'reset-code' ? 'Enter the security code set in system settings.' : 'Setup your new administrator login details.'}
                </div>
              </div>

              {resetError && <div className="login-error" style={{ marginBottom: 20 }}>⚠ {resetError}</div>}

              <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {view === 'reset-code' ? (
                  <div className="form-group">
                    <label className="form-label">Security Code</label>
                    <input 
                      className="form-input" 
                      type="password" 
                      placeholder="Enter recovery code" 
                      autoFocus
                      value={resetData.code} 
                      onChange={e => setResetData(p => ({ ...p, code: e.target.value }))}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">New Admin Username</label>
                      <input className="form-input" value={resetData.user} onChange={e => setResetData(p => ({ ...p, user: e.target.value }))} placeholder="New username"/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input className="form-input" type="password" value={resetData.pwd} onChange={e => setResetData(p => ({ ...p, pwd: e.target.value }))} placeholder="New password"/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm Password</label>
                      <input className="form-input" type="password" value={resetData.confirm} onChange={e => setResetData(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password"/>
                    </div>
                  </>
                )}

                <button type="submit" className="btn btn--primary" style={{ marginTop: 10, height: 45 }}>
                  {view === 'reset-code' ? 'Verify Code' : 'Update Credentials'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => { setView('login'); setResetError(''); }} style={{ height: 45 }}>
                  Back to Login
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600, letterSpacing: '0.5px' }}>
              DEVELOPED BY GIRISH KOTTAYAM
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
