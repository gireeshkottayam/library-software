import React, { useState, useEffect } from 'react'
import { Search, User, BookOpen, Clock, Calendar, Download, Printer } from 'lucide-react'
import { useSettings } from '../App.jsx'

export default function Borrowers() {
  const { settings, t, language } = useSettings()
  const [borrowers, setBorrowers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const rows = await window.api.getActiveBorrowings()
      setBorrowers(rows || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = borrowers.filter(b => 
    b.full_name.toLowerCase().includes(search.toLowerCase()) ||
    b.reg_no.toLowerCase().includes(search.toLowerCase()) ||
    b.title.toLowerCase().includes(search.toLowerCase())
  )

  function printList() {
    window.print()
  }

  return (
    <div className="borrowers-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Active Borrowers</h1>
          <p className="page-header__sub">List of members who currently have books issued</p>
        </div>
        <div className="page-header__actions">
          <div className="search-bar" style={{maxWidth:300}}>
            <Search size={15} className="search-icon"/>
            <input 
              placeholder="Search member or book…" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn--secondary" onClick={printList}>
            <Printer size={15}/> Print List
          </button>
        </div>
      </div>

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <div className="table-wrap">
          {loading ? (
            <div style={{padding:40, textAlign:'center', color:'var(--text-muted)'}}>Loading borrowers…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📖</div>
              <div className="empty-state__title">No active borrowers</div>
              <div className="empty-state__sub">All books are currently returned</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Book Details</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const isOverdue = new Date() > new Date(b.due_date)
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{fontWeight:600}}>{b.full_name}</div>
                        <div className="td-muted" style={{fontSize:12}}>{b.reg_no} • {b.phone}</div>
                      </td>
                      <td>
                        <div style={{fontWeight:600}}>{b.title}</div>
                        <div className="td-muted" style={{fontSize:11}}>{b.author}</div>
                      </td>
                      <td className="td-muted">
                        <div style={{display:'flex', alignItems:'center', gap:4}}>
                          <Calendar size={12}/> {b.issue_date}
                        </div>
                      </td>
                      <td>
                        <div style={{
                          display:'flex', 
                          alignItems:'center', 
                          gap:4, 
                          color: isOverdue ? 'var(--red)' : 'inherit',
                          fontWeight: isOverdue ? 700 : 500
                        }}>
                          <Clock size={12}/> {b.due_date}
                        </div>
                      </td>
                      <td>
                        {isOverdue ? (
                          <span className="badge badge--red">Overdue</span>
                        ) : (
                          <span className="badge badge--green">On Time</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .sidebar, .page-header__actions, .btn, .title-bar { display: none !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #eee !important; padding: 8px !important; text-align: left !important; }
          .badge { border: 1px solid #ccc !important; color: #000 !important; }
        }
      `}}/>
    </div>
  )
}
