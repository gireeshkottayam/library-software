import React, { useState, useEffect } from 'react'
import { Search, X, ArrowRight, RotateCcw, RefreshCw, UserPlus } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSettings } from '../App.jsx'
import { sendWhatsAppNotification } from '../utils/notifications'

export default function Borrowing() {
  const { settings, language, t } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab]           = useState(searchParams.get('tab') || 'issue')
  const [active, setActive]     = useState([])
  const [overdue, setOverdue]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState(null)

  // Issue form
  const [memberSearch, setMemberSearch] = useState('')
  const [bookSearch, setBookSearch]     = useState('')
  const [memberResults, setMemberResults] = useState([])
  const [bookResults, setBookResults]     = useState([])
  const [selMember, setSelMember]       = useState(null)
  const [selBook, setSelBook]           = useState(null)
  const [issuing, setIssuing]           = useState(false)

  // Return form
  const [returnSearch, setReturnSearch] = useState('')
  const [returnResults, setReturnResults] = useState([])
  const [returning, setReturning]       = useState(false)
  const [returnCondition, setReturnCondition] = useState('Good')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && t !== tab) setTab(t)
  }, [searchParams])

  useEffect(() => { loadActive() }, [tab])

  async function loadActive() {
    setLoading(true)
    const [a, o] = await Promise.all([window.api.getActiveBorrowings(), window.api.getOverdueBorrowings()])
    setActive(a); setOverdue(o); setLoading(false)
  }

  function toast2(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),4000) }

  // Member search
  useEffect(() => {
    if (memberSearch.length < 2) { setMemberResults([]); return }
    const t = setTimeout(async () => {
      const r = await window.api.searchMembers(memberSearch)
      setMemberResults(r.slice(0,5))
    }, 300)
    return () => clearTimeout(t)
  }, [memberSearch])

  // Book search
  useEffect(() => {
    if (bookSearch.length < 2) { setBookResults([]); return }
    const t = setTimeout(async () => {
      const r = await window.api.searchBooks(bookSearch)
      setBookResults(r.filter(b=>b.available_copies>0).slice(0,5))
    }, 300)
    return () => clearTimeout(t)
  }, [bookSearch])

  // Return search
  useEffect(() => {
    if (returnSearch.length < 2) { setReturnResults([]); return }
    const t = setTimeout(async () => {
      const all = await window.api.getActiveBorrowings()
      const q = returnSearch.toLowerCase()
      setReturnResults(all.filter(b =>
        b.full_name?.toLowerCase().includes(q) ||
        b.reg_no?.toLowerCase().includes(q) ||
        b.title?.toLowerCase().includes(q)
      ).slice(0,8))
    }, 300)
    return () => clearTimeout(t)
  }, [returnSearch])

  async function handleIssue() {
    if (!selMember) { toast2('Select a member first','error'); return }
    if (!selBook)   { toast2('Select a book first','error'); return }
    setIssuing(true)
    const res = await window.api.issueBook({ member_id: selMember.id, book_id: selBook.id })
    setIssuing(false)
    if (res.success) {
      toast2(`✅ Book issued! Due: ${res.due_date}`)
      sendWhatsAppNotification(selMember, 'borrow', { 
        book: language === 'ml' && selBook.title_ml ? selBook.title_ml : selBook.title, 
        due_date: res.due_date 
      }, { language, settings })
      setSelMember(null); setSelBook(null); setMemberSearch(''); setBookSearch('')
      loadActive()
    } else toast2(res.message||'Error','error')
  }

  async function handleReturn(borrowingId) {
    setReturning(true)
    const res = await window.api.returnBook(borrowingId, { condition: returnCondition })
    setReturning(false)
    if (res.success) {
      toast2(res.fine > 0 ? `Book returned. Fine: ₹${res.fine}` : 'Book returned successfully!')
      
      // Find the borrowing record to get member/book info for notification
      const rec = [...returnResults, ...active, ...overdue].find(r => r.id === borrowingId)
      if (rec) {
        sendWhatsAppNotification(rec, 'return', { 
          book: language === 'ml' && rec.title_ml ? rec.title_ml : rec.title, 
          fine: res.fine 
        }, { language, settings })
      }
      
      setReturnSearch(''); setReturnResults([]); loadActive()
    } else toast2(res.message||'Error','error')
  }

  async function handleRenew(id) {
    const res = await window.api.renewBook(id)
    if (res.success) { toast2(`Renewed! New due: ${res.new_due_date}`); loadActive() }
    else toast2(res.message||'Cannot renew','error')
  }

  const today = new Date().toISOString().slice(0,10)
  const finePerDay = parseFloat(settings.fine_per_day || 2)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">
          <span className="lang-en">Issue & Return</span>
          <span className="lang-ml">വിതരണവും തിരിച്ചെടുക്കലും</span>
        </h1>
        <p className="page-header__sub">
          <span className="lang-en">Manage book lending and returns · Borrow period: {settings.borrow_days||14} days · Fine: ₹{finePerDay}/day</span>
          <span className="lang-ml">പുസ്തകം നൽകുന്നതും തിരിച്ചെടുക്കുന്നതും ക്രമീകരിക്കുക · തിരിച്ചടവ് സമയം: {settings.borrow_days||14} ദിവസം · പിഴ: ₹{finePerDay}/ദിവസം</span>
        </p>
        <div className="page-header__actions">
          <button className="btn btn--ghost btn--sm" onClick={loadActive}><RefreshCw size={14}/> Refresh</button>
        </div>
      </div>

      <div className="tabs">
        {[{id:'issue',l:'📤 Issue Book'},{id:'return',l:'📥 Return Book'},{id:'active',l:`📋 Active (${active.length})`},{id:'overdue',l:`⚠ Overdue (${overdue.length})`}].map(t=>(
          <button key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={()=>{setTab(t.id);setSearchParams({tab:t.id})}}>{t.l}</button>
        ))}
      </div>

      {/* Issue Tab */}
      {tab==='issue' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* Member selector */}
          <div className="card">
            <div style={{fontWeight:700,marginBottom:14,color:'var(--accent-light)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span className="lang-en">1. Select Member</span>
              <span className="lang-ml">1. അംഗത്തെ തിരഞ്ഞെടുക്കുക</span>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/members?action=add')} style={{ color: 'var(--accent)' }}>
                <UserPlus size={14} /> 
                <span className="lang-en">Add New</span>
                <span className="lang-ml">പുതിയ അംഗം</span>
              </button>
            </div>
            <div className="search-bar" style={{marginBottom:10}}>
              <Search size={15} className="search-icon"/>
              <input placeholder="Search member by name, phone, reg no…" value={memberSearch} onChange={e=>{setMemberSearch(e.target.value);setSelMember(null)}}/>
            </div>
            {memberSearch.length >= 2 && memberResults.length === 0 && !selMember && (
              <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px dashed var(--glass-border)' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>No member found matching "{memberSearch}"</div>
                <button className="btn btn--primary btn--sm" onClick={() => navigate('/members?action=add')}>
                  <UserPlus size={14} /> Register New Member
                </button>
              </div>
            )}
            {memberResults.length>0 && !selMember && (
              <div style={{border:'1px solid var(--glass-border)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                {memberResults.map(m=>(
                  <div key={m.id} onClick={()=>{setSelMember(m);setMemberResults([]);setMemberSearch(language==='ml'&&m.full_name_ml?m.full_name_ml:m.full_name)}}
                    style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--glass-border)',transition:'var(--transition)'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}
                  >
                    <div style={{fontWeight:600}}>{language==='ml'&&m.full_name_ml?m.full_name_ml:m.full_name} <span className="badge badge--accent" style={{marginLeft:6}}>{m.reg_no}</span></div>
                    <div className="td-muted">{m.phone} · {m.id_card_type}: {m.id_card_no}</div>
                    {!m.fee_paid && <div style={{color:'var(--red)',fontSize:11}}>⚠ Fee not paid</div>}
                  </div>
                ))}
              </div>
            )}
            {selMember && (
              <div style={{background:'var(--green-dim)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'var(--radius)',padding:'14px'}}>
                <div style={{fontWeight:700,color:'var(--green)'}}>{language==='ml'&&selMember.full_name_ml?selMember.full_name_ml:selMember.full_name}</div>
                <div className="td-muted">{selMember.reg_no} · {selMember.phone}</div>
                <div className="td-muted">{selMember.id_card_type}: {selMember.id_card_no}</div>
                <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span className={`badge ${selMember.status==='Active'?'badge--green':'badge--red'}`}>{selMember.status}</span>
                  <span className={`badge ${selMember.fee_paid?'badge--green':'badge--red'}`}>{selMember.fee_paid?'Fee Paid':'Fee Unpaid'}</span>
                  <span className="badge badge--gray">{selMember.member_type}</span>
                </div>
                <button className="btn btn--ghost btn--sm" style={{marginTop:10}} onClick={()=>{setSelMember(null);setMemberSearch('')}}>✕ Change</button>
              </div>
            )}
          </div>

          {/* Book selector */}
          <div className="card">
            <div style={{fontWeight:700,marginBottom:14,color:'var(--accent-light)'}}>2. Select Book</div>
            <div className="search-bar" style={{marginBottom:10}}>
              <Search size={15} className="search-icon"/>
              <input placeholder="Search available books by title, QR…" value={bookSearch} onChange={e=>{setBookSearch(e.target.value);setSelBook(null)}}/>
            </div>
            {bookResults.length>0 && !selBook && (
              <div style={{border:'1px solid var(--glass-border)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                {bookResults.map(b=>(
                  <div key={b.id} onClick={()=>{setSelBook(b);setBookResults([]);setBookSearch(language==='ml'&&b.title_ml?b.title_ml:b.title)}}
                    style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--glass-border)',transition:'var(--transition)'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}
                  >
                    <div style={{fontWeight:600}}>{language==='ml'&&b.title_ml?b.title_ml:b.title}</div>
                    <div className="td-muted">{b.author} · Available: {b.available_copies}</div>
                    {b.qr_code_no && <div style={{fontSize:11,color:'var(--text-muted)'}}>QR: {b.qr_code_no}</div>}
                  </div>
                ))}
              </div>
            )}
            {selBook && (
              <div style={{background:'var(--accent-dim)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:'var(--radius)',padding:'14px'}}>
                <div style={{fontWeight:700,color:'var(--accent-light)'}}>{language==='ml'&&selBook.title_ml?selBook.title_ml:selBook.title}</div>
                <div className="td-muted">{selBook.author}</div>
                <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span className="badge badge--green">Available: {selBook.available_copies}</span>
                  {selBook.category && <span className="badge badge--accent">{t('cat_'+selBook.category.toLowerCase().replace(/ /g,'_'))}</span>}
                  {selBook.shelf_no && <span className="badge badge--gray">Shelf: {selBook.shelf_no}</span>}
                </div>
                <button className="btn btn--ghost btn--sm" style={{marginTop:10}} onClick={()=>{setSelBook(null);setBookSearch('')}}>✕ Change</button>
              </div>
            )}
          </div>

          {/* Issue action */}
          <div className="card" style={{gridColumn:'1/-1',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px'}}>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>Issue Summary</div>
              <div className="td-muted">
                {selMember && selBook
                  ? `${language==='ml'&&selMember.full_name_ml?selMember.full_name_ml:selMember.full_name} will borrow "${language==='ml'&&selBook.title_ml?selBook.title_ml:selBook.title}" for ${settings.borrow_days||14} days`
                  : 'Select member and book above to proceed'}
              </div>
            </div>
            <button className="btn btn--primary" onClick={handleIssue} disabled={!selMember||!selBook||issuing} style={{padding:'12px 28px',fontSize:15}}>
              <ArrowRight size={16}/> {issuing?'Issuing…':'Issue Book'}
            </button>
          </div>
        </div>
      )}

      {/* Return Tab */}
      {tab==='return' && (
        <div className="card">
          <div style={{fontWeight:700,marginBottom:14,color:'var(--accent-light)'}}>Search active borrowing to return</div>
          <div style={{display:'flex',gap:12,marginBottom:16,alignItems:'center'}}>
            <div className="search-bar" style={{flex:1}}>
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by member name, reg no, book title…" value={returnSearch} onChange={e=>setReturnSearch(e.target.value)}/>
              {returnSearch && <button onClick={()=>{setReturnSearch('');setReturnResults([])}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}><X size={14}/></button>}
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <select className="form-select" value={returnCondition} onChange={e=>setReturnCondition(e.target.value)}>
                {['Good','Fair','Poor','Lost'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {returnResults.length>0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Member</th><th>Book</th><th>Issued</th><th>Due</th><th>Days Late</th><th>Est. Fine</th><th>Action</th></tr></thead>
                <tbody>
                  {returnResults.map(r=>{
                    const late = r.due_date < today ? Math.ceil((new Date(today)-new Date(r.due_date))/86400000) : 0
                    const fine = late * finePerDay
                    return (
                      <tr key={r.id}>
                        <td><div style={{fontWeight:600}}>{language==='ml'&&r.full_name_ml?r.full_name_ml:r.full_name}</div><div className="td-muted">{r.reg_no}</div></td>
                        <td><div style={{fontWeight:500}}>{language==='ml'&&r.title_ml?r.title_ml:r.title}</div></td>
                        <td className="td-muted">{r.issue_date}</td>
                        <td className="td-muted">{r.due_date}</td>
                        <td>{late>0?<span className="badge badge--red">{late}d</span>:<span className="badge badge--green">On time</span>}</td>
                        <td style={{color:fine>0?'var(--red)':'var(--green)',fontWeight:700}}>{fine>0?`₹${fine}`:'—'}</td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn--green btn--sm" onClick={()=>handleReturn(r.id)} disabled={returning}>
                              <RotateCcw size={13}/> Return
                            </button>
                            {!r.renewed && <button className="btn btn--ghost btn--sm" onClick={()=>handleRenew(r.id)}>Renew</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {returnSearch.length>=2 && returnResults.length===0 && <div className="empty-state" style={{padding:'30px 0'}}><div className="empty-state__title">No active borrowing found</div></div>}
        </div>
      )}

      {/* Active Tab */}
      {tab==='active' && (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            {loading ? <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Loading…</div>
            : active.length===0 ? <div className="empty-state"><div className="empty-state__icon">📋</div><div className="empty-state__title">No active borrowings</div></div>
            : <table>
                <thead><tr><th>Member</th><th>Book</th><th>Issued</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {active.map(r=>{
                    const isOverdue = r.due_date < today
                    return (
                      <tr key={r.id}>
                        <td><div style={{fontWeight:600}}>{language==='ml'&&r.full_name_ml?r.full_name_ml:r.full_name}</div><div className="td-muted">{r.reg_no} · {r.phone}</div></td>
                        <td style={{fontWeight:500}}>{language==='ml'&&r.title_ml?r.title_ml:r.title}</td>
                        <td className="td-muted">{r.issue_date}</td>
                        <td className="td-muted">{r.due_date}</td>
                        <td><span className={`badge ${isOverdue?'badge--red':'badge--green'}`}>{isOverdue?'Overdue':'Active'}</span></td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn--green btn--sm" onClick={()=>handleReturn(r.id)}><RotateCcw size={13}/> Return</button>
                            {!r.renewed && <button className="btn btn--ghost btn--sm" onClick={()=>handleRenew(r.id)}>Renew</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            }
          </div>
        </div>
      )}

      {/* Overdue Tab */}
      {tab==='overdue' && (
        <div className="overdue-panel">
          <div className="overdue-panel__header">
            <div className="overdue-pulse"/>
            <div className="overdue-panel__title">⚠ Overdue Books ({overdue.length})</div>
          </div>
          <div className="table-wrap">
            {overdue.length===0 ? <div className="empty-state"><div className="empty-state__title" style={{color:'var(--green)'}}>No overdue books! 🎉</div></div>
            : <table>
                <thead><tr><th>Member</th><th>Phone</th><th>Book</th><th>Due Date</th><th>Days Late</th><th>Est. Fine</th><th>Action</th></tr></thead>
                <tbody>
                  {overdue.map(r=>{
                    const fine = r.days_overdue * finePerDay
                    return (
                      <tr key={r.id}>
                        <td><div style={{fontWeight:600}}>{language==='ml'&&r.full_name_ml?r.full_name_ml:r.full_name}</div><div className="td-muted">{r.reg_no}</div></td>
                        <td style={{color:'var(--cyan)'}}>{r.phone}</td>
                        <td style={{fontWeight:500}}>{language==='ml'&&r.title_ml?r.title_ml:r.title}</td>
                        <td className="td-muted">{r.due_date}</td>
                        <td><span className="badge badge--red">{r.days_overdue} days</span></td>
                        <td style={{color:'var(--red)',fontWeight:700}}>₹{fine.toFixed(0)}</td>
                        <td><button className="btn btn--green btn--sm" onClick={()=>handleReturn(r.id)}><RotateCcw size={13}/> Return</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            }
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className={`toast toast--${toast.type}`}>{toast.msg}</div></div>}
    </div>
  )
}
