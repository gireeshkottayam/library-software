import React, { useState, useEffect } from 'react'
import { Bell, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useSettings } from '../App.jsx'

export default function Notifications() {
  const { settings } = useSettings()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [overdue, borrowings, members] = await Promise.all([
      window.api.getOverdueBorrowings(),
      window.api.getActiveBorrowings(),
      window.api.getMembers({})
    ])

    const list = []
    const t = new Date().toISOString().slice(0, 10)

    // Overdue alerts
    overdue.forEach(o => {
      list.push({
        id: `ov_${o.id}`,
        type: 'error',
        title: `Book Overdue: ${o.title}`,
        desc: `${o.full_name} (${o.reg_no}) was supposed to return this on ${o.due_date}.`,
        date: o.due_date,
        icon: <AlertTriangle size={18}/>
      })
    })

    // Expiring memberships
    const expiring = members.filter(m => {
      if (!m.membership_expiry) return false
      return m.membership_expiry >= t && m.membership_expiry <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    })
    expiring.forEach(m => {
      list.push({
        id: `exp_${m.id}`,
        type: 'warning',
        title: `Membership Expiring: ${m.full_name}`,
        desc: `Membership will expire on ${m.membership_expiry}. Contact for renewal.`,
        date: m.membership_expiry,
        icon: <Bell size={18}/>
      })
    })

    // Due today
    borrowings.filter(b => b.due_date === t).forEach(b => {
      list.push({
        id: `due_${b.id}`,
        type: 'info',
        title: `Return Due Today: ${b.title}`,
        desc: `Borrowed by ${b.full_name}. Expecting return by evening.`,
        date: t,
        icon: <Clock size={18}/>
      })
    })

    setNotifs(list.sort((a,b) => b.date.localeCompare(a.date)))
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Notification Center</h1>
        <p className="page-header__sub">Stay updated with library alerts and activities</p>
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? (
          <div style={{padding:40, textAlign:'center', color:'var(--text-muted)'}}>Scanning systems…</div>
        ) : notifs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🔔</div>
            <div className="empty-state__title">No active notifications</div>
            <div className="empty-state__sub">All systems are operational</div>
          </div>
        ) : (
          <div className="notif-list">
            {notifs.map(n => (
              <div key={n.id} className={`notif-item notif-item--${n.type}`}>
                <div className="notif-item__icon">{n.icon}</div>
                <div className="notif-item__body">
                  <div className="notif-item__title">{n.title}</div>
                  <div className="notif-item__desc">{n.desc}</div>
                </div>
                <div className="notif-item__date">{n.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .notif-list { display: flex; flex-direction: column; }
        .notif-item { 
          display: flex; gap: 20px; padding: 20px 24px; 
          border-bottom: 1px solid var(--glass-border);
          align-items: center; transition: background 0.2s;
        }
        .notif-item:hover { background: rgba(0,0,0,0.02); }
        .notif-item:last-child { border-bottom: none; }
        .notif-item__icon { 
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .notif-item--error .notif-item__icon { background: var(--red-dim); color: var(--red); }
        .notif-item--warning .notif-item__icon { background: var(--amber-dim); color: var(--amber); }
        .notif-item--info .notif-item__icon { background: var(--cyan-dim); color: var(--cyan); }
        .notif-item__body { flex: 1; }
        .notif-item__title { font-weight: 700; font-size: 15px; color: var(--text-primary); }
        .notif-item__desc { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
        .notif-item__date { font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--bg-primary); padding: 4px 10px; border-radius: 6px; }
      `}</style>
    </div>
  )
}
