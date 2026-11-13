import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, useSettings } from '../App.jsx'
import {
  LayoutDashboard, BookOpen, Users, ArrowLeftRight,
  BarChart3, Settings, LogOut, X, Minus, Square, Wallet, Bell, Heart
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const { settings, language } = useSettings()
  const navigate = useNavigate()
  const [overdueCount, setOverdueCount] = useState(0)
  // The version of the app on this computer. It is shown at the bottom of
  // the side bar, so that the librarian can say which build is running.
  const [version, setVersion] = useState('')

  useEffect(() => {
    loadOverdue()
    const t = setInterval(loadOverdue, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    window.api.getVersion().then(setVersion).catch(() => {})
  }, [])

  async function loadOverdue() {
    try {
      const rows = await window.api.getOverdueBorrowings()
      setOverdueCount(rows.length)
      if (rows.length > 0) {
        window.api.showNotification({
          title: 'Overdue Books Alert',
          body: `${rows.length} book(s) are overdue. Please check the dashboard.`
        })
      }
    } catch {}
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', labelMl: 'ഡാഷ്‌ബോർഡ്', end: true },
    { to: '/notifications', icon: <Bell size={18} />, label: 'Notifications', labelMl: 'അറിയിപ്പുകൾ', badge: overdueCount > 0 ? overdueCount : null },
    { to: '/books', icon: <BookOpen size={18} />, label: 'Books', labelMl: 'പുസ്തകങ്ങൾ' },
    { to: '/members', icon: <Users size={18} />, label: 'Members', labelMl: 'അംഗങ്ങൾ' },
    { to: '/borrowing', icon: <ArrowLeftRight size={18} />, label: 'Issue / Return', labelMl: 'ഇഷ്യൂ / റിട്ടേൺ' },
    { to: '/borrowers', icon: <BookOpen size={18} />, label: 'Borrowers', labelMl: 'വായ്പ്പക്കാർ' },
    { to: '/fees', icon: <Wallet size={18} />, label: 'Fees', labelMl: 'ഫീസ്' },
    { to: '/sponsors', icon: <Heart size={18} />, label: 'Sponsors', labelMl: 'സ്പോൺസർമാർ' },
    {to: '/reports', icon: <BarChart3 size={18} />, label: 'Reports', labelMl: 'റിപ്പോർട്ടുകൾ', hidden: user?.role !== 'superadmin' },
    { to: '/settings', icon: <Settings size={18} />, label: 'Settings', labelMl: 'ക്രമീകരണങ്ങൾ', hidden: user?.role !== 'superadmin' },
  ].filter(i => !i.hidden)

  const libName = settings.library_name || 'Public Library Kooroppada'
  const libNameMl = settings.library_name_ml || 'പൊതു ഗ്രന്ഥശാല കൂരോപ്പട'

  return (
    <>
      {/* Title Bar moved to App.jsx */}

      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar__header">
            <div className="sidebar__lib-name lang-ml">{libNameMl}</div>
            <div className="sidebar__lib-name lang-en" style={{fontSize:14}}>{libName}</div>
          </div>

          <nav className="sidebar__nav">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {item.icon}
                <span className="lang-en">{item.label}</span>
                <span className="lang-ml">{item.labelMl}</span>
                {item.badge ? <span className="nav-item__badge">{item.badge}</span> : null}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__user" onClick={handleLogout} title="Click to logout">
              <div className="sidebar__avatar">
                {user?.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="sidebar__user-info">
                <div className="sidebar__user-name">{user?.full_name || 'Admin'}</div>
                <div className="sidebar__user-role">{user?.role} · Logout</div>
              </div>
              <LogOut size={16} color="var(--text-muted)" />
            </div>
            <div className="app-footer">
              Developed by Girish Kottayam
              {version ? <span> · v{version}</span> : null}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  )
}
