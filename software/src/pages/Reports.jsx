import React, { useState, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#06B6D4']

export default function Reports() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats]     = useState(null)
  const [chart, setChart]     = useState([])
  const [overdue, setOverdue] = useState([])
  const [payments, setPayments] = useState([])
  const [all, setAll]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [s, c, o, p, b] = await Promise.all([
      window.api.getDashboardStats(),
      window.api.getChartData(),
      window.api.getOverdueBorrowings(),
      window.api.getPayments({}),
      window.api.getAllBorrowings({}),
    ])
    setStats(s); setChart(c); setOverdue(o); setPayments(p); setAll(b)
    setLoading(false)
  }

  function exportCSV(data, filename) {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const csv  = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k]??''}"`).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = filename
    a.click()
  }

  const categoryData = (() => {
    const map = {}
    all.forEach(b => {
      // count by status
      map[b.status] = (map[b.status]||0)+1
    })
    return Object.entries(map).map(([name,value])=>({name,value}))
  })()

  const totalFee  = payments.filter(p=>p.type==='membership').reduce((s,p)=>s+p.amount,0)
  const totalFine = payments.filter(p=>p.type==='fine').reduce((s,p)=>s+p.amount,0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Reports / റിപ്പോർട്ടുകൾ</h1>
        <p className="page-header__sub">Analytics, statistics and data export</p>
        <div className="page-header__actions">
          <button className="btn btn--ghost btn--sm" onClick={loadAll}><RefreshCw size={14}/> Refresh</button>
        </div>
      </div>

      <div className="tabs">
        {['overview','borrowings','overdue','payments'].map(t=>(
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
            {t==='overview'?'📊 Overview':t==='borrowings'?'📚 Borrowings':t==='overdue'?'⚠ Overdue':'💰 Payments'}
          </button>
        ))}
      </div>

      {loading && <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Loading reports…</div>}

      {!loading && tab==='overview' && stats && (
        <>
          <div className="stats-grid" style={{marginBottom:20}}>
            {[
              {l:'Total Books',v:stats.totalBooks,c:'var(--accent)',i:'📚'},
              {l:'Active Members',v:stats.totalMembers,c:'var(--green)',i:'👥'},
              {l:'Total Issued',v:all.filter(b=>b.status==='Issued').length,c:'var(--cyan)',i:'📤'},
              {l:'Overdue',v:stats.overdueCount,c:'var(--red)',i:'⚠'},
              {l:'Fee Collected',v:`₹${totalFee.toFixed(0)}`,c:'var(--green)',i:'💰'},
              {l:'Fine Collected',v:`₹${totalFine.toFixed(0)}`,c:'var(--amber)',i:'⚡'},
            ].map(s=>(
              <div key={s.l} className="stat-card">
                <div className="stat-card__icon">{s.i}</div>
                <div className="stat-card__value" style={{color:s.c}}>{s.v}</div>
                <div className="stat-card__label">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-card__title">Books Issued per Month</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chart}>
                  <XAxis dataKey="month" tick={{fill:'#64748B',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#64748B',fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'#131C35',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#F1F5F9'}}/>
                  <Bar dataKey="issued" fill="#6366F1" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-card__title">Borrowing Status Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                    {categoryData.map((_, i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#131C35',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!loading && tab==='borrowings' && (
        <div className="card" style={{padding:0}}>
          <div style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--glass-border)'}}>
            <span style={{fontWeight:600}}>All Borrowings ({all.length})</span>
            <button className="btn btn--ghost btn--sm" onClick={()=>exportCSV(all,'borrowings.csv')}><Download size={14}/> Export CSV</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Member</th><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Status</th></tr></thead>
              <tbody>
                {all.map((r,i)=>(
                  <tr key={r.id}>
                    <td className="td-muted">{i+1}</td>
                    <td><div style={{fontWeight:600}}>{r.full_name}</div><div className="td-muted">{r.reg_no}</div></td>
                    <td>{r.title}</td>
                    <td className="td-muted">{r.issue_date}</td>
                    <td className="td-muted">{r.due_date}</td>
                    <td className="td-muted">{r.return_date||'—'}</td>
                    <td><span className={`badge ${r.status==='Returned'?'badge--green':r.status==='Issued'?'badge--amber':'badge--red'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab==='overdue' && (
        <div className="overdue-panel">
          <div className="overdue-panel__header">
            <div className="overdue-pulse"/>
            <div className="overdue-panel__title">Overdue Books ({overdue.length})</div>
            <button className="btn btn--ghost btn--sm" style={{marginLeft:'auto'}} onClick={()=>exportCSV(overdue,'overdue.csv')}><Download size={14}/> Export</button>
          </div>
          <div className="table-wrap">
            {overdue.length===0
              ? <div className="empty-state"><div className="empty-state__title" style={{color:'var(--green)'}}>No overdue books!</div></div>
              : <table>
                  <thead><tr><th>Reg No.</th><th>Member</th><th>Phone</th><th>Book</th><th>Due</th><th>Days Late</th><th>Fine (₹)</th></tr></thead>
                  <tbody>
                    {overdue.map(r=>(
                      <tr key={r.id}>
                        <td><span className="badge badge--accent">{r.reg_no}</span></td>
                        <td style={{fontWeight:600}}>{r.full_name}</td>
                        <td style={{color:'var(--cyan)'}}>{r.phone}</td>
                        <td>{r.title}</td>
                        <td className="td-muted">{r.due_date}</td>
                        <td><span className="badge badge--red">{r.days_overdue}d</span></td>
                        <td style={{color:'var(--red)',fontWeight:700}}>₹{(r.days_overdue*2).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </div>
      )}

      {!loading && tab==='payments' && (
        <div className="card" style={{padding:0}}>
          <div style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--glass-border)'}}>
            <span style={{fontWeight:600}}>Payment History ({payments.length}) · Total: ₹{(totalFee+totalFine).toFixed(0)}</span>
            <button className="btn btn--ghost btn--sm" onClick={()=>exportCSV(payments,'payments.csv')}><Download size={14}/> Export CSV</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Member</th><th>Type</th><th>Amount</th><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {payments.map((p,i)=>(
                  <tr key={p.id}>
                    <td className="td-muted">{i+1}</td>
                    <td><div style={{fontWeight:600}}>{p.full_name}</div><div className="td-muted">{p.reg_no}</div></td>
                    <td><span className={`badge ${p.type==='membership'?'badge--accent':'badge--amber'}`}>{p.type}</span></td>
                    <td style={{color:'var(--green)',fontWeight:700}}>₹{p.amount}</td>
                    <td className="td-muted">{p.date}</td>
                    <td className="td-muted">{p.notes||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
