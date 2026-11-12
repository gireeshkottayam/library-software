import { useNavigate } from 'react-router-dom'
import { Minus, Square, X, Moon, Sun, Languages, ShieldAlert } from 'lucide-react'
import { useSettings } from '../App.jsx'

export default function TitleBar() {
  const navigate = useNavigate()
  const { settings, theme, toggleTheme, language, toggleLanguage, activated, licenseInfo } = useSettings()
  const libName = settings?.library_name || 'Public Library Kooroppada'

  return (
    <div className="titlebar">
      <div className="titlebar__logo">
        <div className="titlebar__logo-icon">📚</div>
        <span className="titlebar__name lang-en">{settings?.library_name || 'Public Library Kooroppada'}</span>
        <span className="titlebar__name lang-ml">{settings?.library_name_ml || 'പൊതു ഗ്രന്ഥശാല'}</span>
      </div>
      <div className="titlebar__controls">
        {!activated && licenseInfo && (
          <div className="trial-badge" onClick={() => navigate('/settings?tab=license')}>
            <ShieldAlert size={14} style={{ marginRight: 6 }} />
            <span>Trial: {licenseInfo.trialRemaining} days left</span>
            <span className="activate-link">Activate license</span>
          </div>
        )}

        <button className="titlebar__btn" onClick={toggleLanguage} title="Switch Language" style={{ fontSize: 11, fontWeight: 600, width: 'auto', padding: '0 8px' }}>
          {language === 'en' ? 'മല' : 'EN'}
        </button>
        <button className="titlebar__btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--glass-border)', margin: '0 4px', alignSelf: 'center' }} />
        <button className="titlebar__btn" onClick={() => window.api.minimize()} title="Minimize">
          <Minus size={14} />
        </button>
        <button className="titlebar__btn" onClick={() => window.api.maximize()} title="Maximize">
          <Square size={12} />
        </button>
        <button className="titlebar__btn titlebar__btn--close" onClick={() => window.api.close()} title="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
