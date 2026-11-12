import React, { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Activation from './pages/Activation.jsx'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import TitleBar from './components/TitleBar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Books from './pages/Books.jsx'
import Members from './pages/Members.jsx'
import Borrowing from './pages/Borrowing.jsx'
import Borrowers from './pages/Borrowers.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import Fees from './pages/Fees.jsx'
import OnboardingWizard from './components/OnboardingWizard.jsx'
import Notifications from './pages/Notifications.jsx'
import Sponsors from './pages/Sponsors.jsx'
import { translations } from './translations.js'

export const AuthContext = createContext(null)
export const SettingsContext = createContext({})

export function useAuth() { return useContext(AuthContext) }
export function useSettings() { return useContext(SettingsContext) }

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('lib_user')) } catch { return null }
  })
  const [settings, setSettings] = useState({})
  const [theme, setTheme] = useState(localStorage.getItem('lib_theme') || 'light')
  const [language, setLanguage] = useState(localStorage.getItem('lib_lang') || 'en')
  const [activated, setActivated] = useState(null)
  const [licenseInfo, setLicenseInfo] = useState(null)
  const [restoreReport, setRestoreReport] = useState(null)

  useEffect(() => {
    // Safety timeout: if checkLicense takes >10s, unblock the UI
    const timeout = setTimeout(() => {
      console.error('checkLicense timed out — forcing expired trial state')
      setActivated(false)
      setLicenseInfo({ activated: false, type: 'Trial', trialRemaining: 0, isExpired: true })
    }, 10000)

    window.api.checkLicense()
      .then(res => {
        clearTimeout(timeout)
        setActivated(res?.activated ?? false)
        setLicenseInfo(res ?? { activated: false, type: 'Trial', trialRemaining: 0, isExpired: true })
      })
      .catch(err => {
        clearTimeout(timeout)
        console.error('checkLicense error:', err)
        // On error, allow trial access rather than locking the user out
        setActivated(false)
        setLicenseInfo({ activated: false, type: 'Trial', trialRemaining: 7, isExpired: false })
      })

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => { if (user) loadSettings() }, [user])

  // A restore restarts the software, so the window that started it can no
  // longer show the result. The result is written to a file next to the
  // database and shown here, after the restart.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    window.api.getRestoreReport()
      .then(report => { if (!cancelled && report) setRestoreReport(report) })
      .catch(err => console.error('Reading the restore report failed:', err))
    return () => { cancelled = true }
  }, [user])

  async function dismissRestoreReport() {
    setRestoreReport(null)
    try { await window.api.clearRestoreReport() } catch (err) {}
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lib_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-lang', language)
    localStorage.setItem('lib_lang', language)
  }, [language])

  async function loadSettings() {
    const s = await window.api.getAllSettings()
    setSettings(s)
  }

  function login(userData) {
    sessionStorage.setItem('lib_user', JSON.stringify(userData))
    setUser(userData)
  }

  function logout() {
    sessionStorage.removeItem('lib_user')
    setUser(null)
  }

  function toggleTheme() { setTheme(t => t === 'light' ? 'dark' : 'light') }
  function toggleLanguage() { setLanguage(l => l === 'en' ? 'ml' : 'en') }

  const t = (key) => translations[language][key] || key

  if (activated === null) return (
    <HashRouter>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base, #0A0F1E)',
        color: 'var(--text-primary, #fff)', flexDirection: 'column', gap: 16
      }}>
        <TitleBar />
        <div style={{ marginTop: 60, fontSize: 18, opacity: 0.7 }}>Loading…</div>
      </div>
    </HashRouter>
  )

  if (!activated && licenseInfo?.isExpired) {
    return (
      <SettingsContext.Provider value={{ 
        settings, loadSettings, theme, setTheme, language, setLanguage, t, 
        activated, setActivated, licenseInfo
      }}>
        <HashRouter>
          <TitleBar />
          <div style={{ paddingTop: 'var(--titlebar-h, 40px)', background: 'var(--bg-base, #0A0F1E)', minHeight: '100vh' }}>
            <div style={{
              background: 'rgba(220,60,60,0.15)', border: '1px solid rgba(220,60,60,0.4)',
              color: '#ff6b6b', padding: '12px 24px', textAlign: 'center',
              fontWeight: 700, fontSize: 14, letterSpacing: 0.5
            }}>
              ⚠️ Your trial period has expired. Please enter a valid serial key to continue.
            </div>
            <Activation onActivate={() => setActivated(true)} />
          </div>
        </HashRouter>
      </SettingsContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <SettingsContext.Provider value={{ 
        settings, loadSettings, theme, setTheme, toggleTheme, language, setLanguage, toggleLanguage, t, 
        activated, setActivated, licenseInfo
      }}>
        <HashRouter>
          <TitleBar />
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
              <Route index element={<Dashboard />} />
              <Route path="books" element={<Books />} />
              <Route path="members" element={<Members />} />
              <Route path="borrowing" element={<Borrowing />} />
              <Route path="borrowers" element={<Borrowers />} />
              <Route path="fees" element={<Fees />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="sponsors" element={<Sponsors />} />
              <Route path="reports" element={user?.role === 'superadmin' ? <Reports /> : <Navigate to="/" />} />
              <Route path="settings" element={user?.role === 'superadmin' ? <Settings /> : <Navigate to="/" />} />
            </Route>
          </Routes>
        </HashRouter>
        {user?.role === 'superadmin' && !settings.library_name && (
          <OnboardingWizard onComplete={loadSettings} />
        )}
        {user && restoreReport && (
          <div className="modal-overlay" style={{ zIndex: 200 }}>
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal__header">
                <div className="modal__title">
                  🗄 <span className="lang-en">Backup restored</span>
                  <span className="lang-ml">ബാക്കപ്പ് തിരിക്കപ്പെടുത്തി</span>
                </div>
              </div>
              <div className="modal__body">
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                  <span className="lang-en">
                    {restoreReport.books} book{restoreReport.books === 1 ? '' : 's'} are back.
                  </span>
                  <span className="lang-ml">
                    {restoreReport.books} പുസ്തകങ്ങൾ തിരിക്കപ്പെടുത്തി.
                  </span>
                </div>
                {restoreReport.missingAmounts > 0 ? (
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <span className="lang-en">
                      {restoreReport.missingAmounts} of them have no amount recorded. The backup was taken
                      with a version that never saved the price, so the amounts are not inside the file and
                      no restore can bring them back. Type them in once with
                      <strong> Set amounts </strong>
                      on the Books page.
                    </span>
                    <span className="lang-ml">
                      {restoreReport.missingAmounts} പുസ്തകങ്ങളുടെ വില രേഖപ്പെടുത്തിയിട്ടില്ല. ബാക്കപ്പ് എടുത്തപ്പോൾ ഉപയോഗിച്ച പതിപ്പ് വില രേഖപ്പെടുത്തില്ലാത്ത പതിപ്പ് ആണ്, അതിനാൽ വിലകൾ ഫയലിലുള്ളില്ല. പുസ്തക പേജിലെ
                      <strong> വില നൽകുക </strong>
                      എന്നതിലൂടെ ഒരിക്കൽ നൽകുക.
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <span className="lang-en">Every book kept its amount. The restore is complete.</span>
                    <span className="lang-ml">എല്ലാ പുസ്തകങ്ങളുടെയും വില നിലനിൽക്കുന്നു. തിരിക്കൽ പൂർത്തിയായി.</span>
                  </div>
                )}
              </div>
              <div className="modal__footer">
                <button className="btn btn--ghost" onClick={dismissRestoreReport}>
                  <span className="lang-en">Close</span>
                  <span className="lang-ml">അടയ്ക്കുക</span>
                </button>
                {restoreReport.missingAmounts > 0 && (
                  <button
                    className="btn btn--primary"
                    onClick={() => { dismissRestoreReport(); window.location.hash = '#/books' }}
                  >
                    <span className="lang-en">Open the Books page</span>
                    <span className="lang-ml">പുസ്തക പേജ് തുറക്കുക</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </SettingsContext.Provider>
    </AuthContext.Provider>
  )
}
