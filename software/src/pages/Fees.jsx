import React, { useState, useEffect } from 'react'
import { Search, DollarSign, Wallet, Calendar, Clock, ArrowRight, User, CheckCircle } from 'lucide-react'
import { useSettings } from '../App.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Fees() {
  const { settings, t, language } = useSettings()
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 })
  const [recent, setRecent] = useState([])
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (search.length > 2) {
      window.api.searchMembers(search).then(setMembers)
    } else {
      setMembers([])
    }
  }, [search])

  async function loadData() {
    setLoading(true)
    const [s, r] = await Promise.all([
      window.api.getFeeStats(),
      window.api.getRecentPayments(15)
    ])
    setStats(s)
    setRecent(r)
    setLoading(false)
  }

  function toast2(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function collectFee(m) {
    const feeKey = `membership_fee_${(m.member_type || 'yearly').toLowerCase()}`
    const defaultFee = settings[feeKey] || settings.membership_fee_yearly || 1000
    const amt = prompt(`Collect Fee from ${m.full_name} (${m.reg_no})\nAmount:`, defaultFee)
    
    if (!amt || isNaN(amt)) return

    const res = await window.api.payMemberFee(m.id, parseFloat(amt))
    if (res.success) {
      toast2(`✅ ₹${amt} collected from ${m.full_name}`)
      setSearch('')
      loadData()
    } else {
      toast2(res.message || 'Error collecting fee', 'error')
    }
  }

  const chartData = [
    { name: 'Today', value: stats.today, color: 'var(--accent)' },
    { name: 'This Week', value: stats.week, color: 'var(--cyan)' },
    { name: 'This Month', value: stats.month, color: 'var(--green)' }
  ]

  return (
    <div className="fees-page">
      <div className="page-header">
        <h1 className="page-header__title">
          <span className="lang-en">Fee Collection & Analytics</span>
          <span className="lang-ml">ഫീസ് ശേഖരണവും കണക്കുകളും</span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* Left Side: Collection & Search */}
        <div>
          <div className="card" style={{ marginBottom: 24, padding: 24, background: 'var(--glass-bg)', border: '1px solid var(--accent-dim)' }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={18} color="var(--accent)"/>
              <span className="lang-en">Quick Member Search</span>
              <span className="lang-ml">അംഗത്തെ തിരയുക</span>
            </h3>
            <div className="search-bar" style={{ width: '100%', maxWidth: 'none', background: 'var(--bg-primary)' }}>
              <Search size={18} className="search-icon" />
              <input 
                placeholder="Enter Name, Reg No or Phone..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: 16, padding: '12px 40px' }}
              />
            </div>

            {members.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.slice(0, 5).map(m => (
                  <div key={m.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderStyle: 'dashed' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{m.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.reg_no} · {m.phone}</div>
                    </div>
                    <button className="btn btn--primary btn--sm" onClick={() => collectFee(m)}>
                      <DollarSign size={14} /> Collect Fee
                    </button>
                  </div>
                ))}
              </div>
            )}
            {search.length > 2 && members.length === 0 && (
              <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No members found</div>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Recent Payments</span>
              <Clock size={16} color="var(--text-muted)"/>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.full_name}</div>
                        <div className="td-muted">{p.reg_no}</div>
                      </td>
                      <td><span className={`badge ${p.type === 'membership' ? 'badge--accent' : 'badge--amber'}`}>{p.type}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>₹{p.amount}</td>
                      <td className="td-muted">{p.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div className="stat-card__label">Today's Collection</div>
              <div className="stat-card__value" style={{ color: 'var(--accent)' }}>₹{stats.today.toFixed(0)}</div>
              <Calendar size={16} className="td-muted" style={{ marginTop: 8 }}/>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--cyan)' }}>
              <div className="stat-card__label">Last 7 Days</div>
              <div className="stat-card__value" style={{ color: 'var(--cyan)' }}>₹{stats.week.toFixed(0)}</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--green)' }}>
              <div className="stat-card__label">This Month</div>
              <div className="stat-card__value" style={{ color: 'var(--green)' }}>₹{stats.month.toFixed(0)}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 20, fontSize: 16 }}>Collection Overview</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={16}/> : <X size={16}/>}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
