import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, RefreshCw, Phone, UserPlus, ArrowUpRight, ArrowDownLeft, BookPlus, DollarSign, Wallet, ChevronRight, X, Settings, Camera
} from 'lucide-react'
import Scanner from '../components/Scanner.jsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'
import { useAuth, useSettings } from '../App.jsx'

export default function Dashboard() {
  const { settings, t, language } = useSettings()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [chart, setChart] = useState([])
  const [overdue, setOverdue] = useState([])
  const [dueToday, setDueToday] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrMember, setQrMember] = useState(null)
  const [toast, setToast] = useState(null)
  const [showScanner, setShowScanner] = useState(false)


  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    
    // Load main stats first for immediate feedback
    const s = await window.api.getDashboardStats()
    setStats(s)
    
    // Load the rest in background
    Promise.all([
      window.api.getChartData(),
      window.api.getOverdueBorrowings(),
      window.api.getActiveBorrowings(),
    ]).then(([c, o, all]) => {
      setChart(c)
      setOverdue(o)
      const today = new Date().toISOString().slice(0, 10)
      setDueToday(all.filter(b => b.due_date === today))
      setLoading(false)
    })
  }

  function toast2(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),4000) }

  async function handleQRScan(code) {
    setShowScanner(false)
    if (qrMember) return
    // Search member by reg_no
    const members = await window.api.searchMembers(code)
    const m = members.find(x => x.reg_no === code)
    if (m) {
      setQrMember(m)
    } else {
      toast2('Member not found with this ID', 'error')
    }
  }


  async function collectFee(m) {
    const amt = prompt(`Enter amount to collect from ${m.full_name}:`, m.fee_amount || 100)
    if (!amt || isNaN(amt)) return
    const res = await window.api.payMemberFee(m.id, parseFloat(amt))
    if (res.success) {
      toast2(`✅ ₹${amt} Fee collected for ${m.full_name}`)
      setQrMember(null)
      load()
    } else toast2('Error collecting fee', 'error')
  }


  const statCards = stats ? [
    { key: 'stats_total_books', value: stats.totalBooks, icon: '📚', color: 'var(--accent)' },
    { key: 'stats_active_members', value: stats.totalMembers, icon: '👥', color: 'var(--green)' },
    { label: 'Issued Today', labelMl: 'ഇന്ന് ഇഷ്യൂ', value: stats.issuedToday, icon: '📤', color: 'var(--cyan)' },
    { label: 'Returned Today', labelMl: 'ഇന്ന് തിരിച്ചേൽപ്പ്', value: stats.returnedToday, icon: '📥', color: 'var(--green)' },
    { key: 'stats_overdue', value: stats.overdueCount, icon: '⚠️', color: 'var(--red)' },
    { label: 'Due Today', labelMl: 'ഇന്ന് തിരിച്ചു നൽകേണ്ടത്', value: dueToday.length, icon: '🔔', color: 'var(--amber)' },
    { label: 'Fee (This Month)', labelMl: 'ഫീസ് (ഈ മാസം)', value: `₹${(stats.feeCollectedMonth||0).toFixed(0)}`, icon: '💰', color: 'var(--green)', adminOnly: true },
    { label: 'Expiring Members', labelMl: 'കാലഹരണ അംഗങ്ങൾ', value: stats.expiringMembers, icon: '📅', color: 'var(--amber)' },
  ].filter(c => !c.adminOnly || user?.role === 'superadmin') : []

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-header__title">
              <span className="lang-en">Dashboard</span>
              <span className="lang-ml">ഡാഷ്ബോർഡ്</span>
            </h1>
            <p className="page-header__sub">
              <span className="lang-en">{settings.library_name || 'Public Library Kooroppada'} — Overview</span>
              <span className="lang-ml">{settings.library_name_ml || 'പൊതു ഗ്രന്ഥശാല കൂരോപ്പട'} — ഒരു നോട്ടം</span>
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span className="lang-en">{loading ? 'Loading…' : 'Refresh'}</span>
            <span className="lang-ml">{loading ? 'കാത്തിരിക്കുക...' : 'പുതുക്കുക'}</span>
          </button>
        </div>
      </div>

      {/* Notifications Hub */}
      {!loading && stats && (
        <div className="notifications-hub" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
            {stats.overdueCount > 0 && (
              <div className="notif-card notif-card--red" onClick={() => setTab && setTab('overdue')}>
                <div className="notif-card__icon">⚠</div>
                <div className="notif-card__content">
                  <div className="notif-card__title">{stats.overdueCount} Books Overdue</div>
                  <div className="notif-card__sub">Action required: Contact borrowers immediately</div>
                </div>
              </div>
            )}
            {stats.expiringMembers > 0 && (
              <div className="notif-card notif-card--amber" onClick={() => navigate('/members')}>
                <div className="notif-card__icon">📅</div>
                <div className="notif-card__content">
                  <div className="notif-card__title">{stats.expiringMembers} Memberships Expiring</div>
                  <div className="notif-card__sub">Renewals due within 7 days</div>
                </div>
              </div>
            )}
            {user?.role === 'superadmin' && stats.finePendingAmount > 0 && (
              <div className="notif-card notif-card--cyan" onClick={() => navigate('/fees')}>
                <div className="notif-card__icon">💰</div>
                <div className="notif-card__content">
                  <div className="notif-card__title">₹{stats.finePendingAmount.toFixed(0)} Pending Fines</div>
                  <div className="notif-card__sub">Total uncollected fines from {stats.overdueCount} borrowers</div>
                </div>
              </div>
            )}
            {stats.overdueCount === 0 && stats.expiringMembers === 0 && (
              <div style={{
                flex: 1, padding: '24px', borderRadius: 'var(--radius)', 
                background: 'linear-gradient(135deg, var(--green-dim) 0%, rgba(16,124,16,0.05) 100%)',
                border: '1px solid rgba(16,124,16,0.1)', display: 'flex', alignItems: 'center', gap: 20
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 12px rgba(16,124,16,0.3)' }}>✅</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>All Systems Operational</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Your library is running smoothly. No urgent alerts or overdue books to report.</div>
                </div>
                <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/notifications')}>
                  History <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
          {(stats.overdueCount > 0 || stats.expiringMembers > 0) && (
            <div style={{textAlign:'right', marginTop:10}}>
              <button className="btn btn--link btn--sm" onClick={() => navigate('/notifications')}>
                View All Notifications <ChevronRight size={14}/>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="quick-action-btn" onClick={() => setShowScanner(true)} style={{background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff'}}>
          <div className="qa-icon" style={{color: '#fff', background: 'transparent'}}><Camera size={24}/></div>
          <span style={{fontWeight: 700}}>Scan ID Card</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/members?action=add')} style={{background: 'var(--accent-dim)', borderColor: 'rgba(0,95,184,0.2)'}}>

          <div className="qa-icon" style={{color: 'var(--accent)', background: 'transparent'}}><UserPlus size={24}/></div>
          <span>Add New Member</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/books?action=add')} style={{background: 'var(--amber-dim)', borderColor: 'rgba(216,59,1,0.2)'}}>
          <div className="qa-icon" style={{color: 'var(--amber)', background: 'transparent'}}><BookPlus size={24}/></div>
          <span>Add New Book</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/borrowing?tab=issue')} style={{background: 'var(--cyan-dim)', borderColor: 'rgba(0,130,114,0.2)'}}>
          <div className="qa-icon" style={{color: 'var(--cyan)', background: 'transparent'}}><ArrowUpRight size={24}/></div>
          <span>Issue Book</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/borrowing?tab=return')} style={{background: 'var(--green-dim)', borderColor: 'rgba(16,124,16,0.2)'}}>
          <div className="qa-icon" style={{color: 'var(--green)', background: 'transparent'}}><ArrowDownLeft size={24}/></div>
          <span>Return Book</span>
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/fees')} style={{background: 'var(--cyan-dim)', borderColor: 'rgba(0,120,212,0.2)'}}>
          <div className="qa-icon" style={{color: 'var(--cyan)', background: 'transparent'}}><Wallet size={24}/></div>
          <span>Collect Fee</span>
        </button>
        {user?.role === 'superadmin' && (
          <button className="quick-action-btn" onClick={() => navigate('/settings')} style={{background: 'var(--glass-bg)', borderColor: 'var(--glass-border)'}}>
            <div className="qa-icon" style={{color: 'var(--text-muted)', background: 'transparent'}}><Settings size={24}/></div>
            <span>System Settings</span>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {loading
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ width: 44, height: 44, marginBottom: 16 }} />
                <div className="skeleton" style={{ width: 60, height: 32, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 100, height: 16 }} />
              </div>
            ))
          : statCards.map((sc, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card__icon" style={{ background: `${sc.color}15`, color: sc.color }}>
                  {sc.icon}
                </div>
                <div className="stat-card__value" style={{ color: sc.color }}>{sc.value}</div>
                <div className="stat-card__label">
                  <span className="lang-en">{sc.label || t(sc.key)}</span>
                  <span className="lang-ml">{sc.labelMl || t(sc.key)}</span>
                </div>
              </div>
            ))
        }
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card__title">📊 Books Issued — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#605E5C', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#605E5C', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="issued" fill="var(--accent)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-card__title">👥 New Members — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#605E5C', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#605E5C', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="members" stroke="var(--green)" strokeWidth={3} dot={{ fill: 'var(--green)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overdue Panel */}
      {overdue.length > 0 && (
        <div className="overdue-panel" style={{ marginBottom: 20 }}>
          <div className="overdue-panel__header">
            <div className="overdue-pulse" />
            <div className="overdue-panel__title">⚠ Overdue Books ({overdue.length})</div>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
              Fine: ₹{settings.fine_per_day || 2}/day
            </div>
          </div>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Book</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Est. Fine</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map(row => {
                  const fine = row.days_overdue * parseFloat(settings.fine_per_day || 2)
                  return (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{language === 'ml' && row.full_name_ml ? row.full_name_ml : row.full_name}</div>
                        <div className="td-muted">{row.reg_no}</div>
                      </td>
                      <td>
                        <a href={`tel:${row.phone}`} style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500 }}>
                          <Phone size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{row.phone}
                        </a>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{language === 'ml' && row.title_ml ? row.title_ml : row.title}</div>
                        <div className="td-muted">{row.author}</div>
                      </td>
                      <td className="td-muted">{row.due_date}</td>
                      <td>
                        <span className="badge badge--red">{row.days_overdue} days</span>
                      </td>
                      <td style={{ color: 'var(--red)', fontWeight: 700 }}>₹{fine.toFixed(0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Due Today */}
      {dueToday.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--amber)', borderLeftWidth: 4, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={18} color="var(--amber)" />
            <span style={{ fontWeight: 600, color: 'var(--amber)', fontSize: 16 }}>Due Today ({dueToday.length} books)</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Member</th><th>Phone</th><th>Book</th><th>Reg No.</th></tr>
              </thead>
              <tbody>
                {dueToday.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{language === 'ml' && row.full_name_ml ? row.full_name_ml : row.full_name}</td>
                    <td className="td-muted">{row.phone}</td>
                    <td style={{ fontWeight: 500 }}>{language === 'ml' && row.title_ml ? row.title_ml : row.title}</td>
                    <td><span className="badge badge--amber">{row.reg_no}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && overdue.length === 0 && dueToday.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px', borderColor: 'var(--green)', borderLeftWidth: 4 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: 18 }}>All books are on time!</div>
          <div className="td-muted" style={{ marginTop: 8, fontFamily: 'var(--font-ml)' }}>എല്ലാ പുസ്തകങ്ങളും സമയത്ത് തിരിച്ചേൽപ്പിക്കുന്നുണ്ട്</div>
        </div>
      )}

      {/* QR Member Action Modal */}
      {qrMember && (
        <div className="modal-overlay" onClick={() => setQrMember(null)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title">🎫 Member Detected</div>
              <button className="modal__close" onClick={() => setQrMember(null)}><X size={16}/></button>
            </div>
            <div className="modal__body" style={{ padding: '24px 20px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{qrMember.full_name}</div>
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 20 }}>{qrMember.reg_no}</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button className="btn btn--ghost" onClick={() => navigate(`/members?id=${qrMember.id}`)} style={{ flexDirection: 'column', height: 'auto', padding: '16px 10px', gap: 8 }}>
                  <Wallet size={20} color="var(--accent)"/>
                  <span>View Profile</span>
                </button>
                <button className="btn btn--ghost" onClick={() => navigate(`/borrowing?tab=issue&member=${qrMember.reg_no}`)} style={{ flexDirection: 'column', height: 'auto', padding: '16px 10px', gap: 8 }}>
                  <ArrowUpRight size={20} color="var(--green)"/>
                  <span>Issue Book</span>
                </button>
                <button className="btn btn--ghost" onClick={() => navigate(`/borrowing?tab=return&search=${qrMember.reg_no}`)} style={{ flexDirection: 'column', height: 'auto', padding: '16px 10px', gap: 8 }}>
                  <ArrowDownLeft size={20} color="var(--amber)"/>
                  <span>Return Book</span>
                </button>
                <button className="btn btn--primary" onClick={() => collectFee(qrMember)} style={{ flexDirection: 'column', height: 'auto', padding: '16px 10px', gap: 8 }}>
                  <DollarSign size={20}/>
                  <span>Collect Fee</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <Scanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
      )}

      {toast && <div className="toast-container"><div className={`toast toast--${toast.type}`}>{toast.msg}</div></div>}
    </div>
  )
}
