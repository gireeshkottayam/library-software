import React, { useState, useEffect } from 'react'
import { Plus, X, Search, Heart, User, Building, Trash2 } from 'lucide-react'
import { useAuth } from '../App.jsx'

export default function Sponsors() {
  const { user } = useAuth()
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'External', member_id: null, description: '' })
  const [members, setMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [s, m] = await Promise.all([
      window.api.getSponsors(),
      window.api.getMembers({})
    ])
    setSponsors(s)
    setMembers(m)
    setLoading(false)
  }

  const hc = e => setForm({ ...form, [e.target.name]: e.target.value })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name) return
    await window.api.addSponsor(form)
    setModal(null)
    setForm({ name: '', type: 'External', member_id: null, description: '' })
    load()
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this sponsor?')) {
      await window.api.deleteSponsor(id)
      load()
    }
  }

  const filteredMembers = memberSearch 
    ? members.filter(m => m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) || m.reg_no.includes(memberSearch))
    : []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Book Sponsors</h1>
          <p className="page-header__sub">Manage library donors and sponsoring members</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal('add')}>
          <Plus size={18} /> <span>Add Sponsor</span>
        </button>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrap">
          {loading ? <div style={{padding:40, textAlign:'center'}}>Loading…</div>
          : sponsors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon"><Heart size={48} /></div>
              <div className="empty-state__title">No sponsors yet</div>
              <div className="empty-state__sub">Add your first library sponsor to start tracking donations</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Sponsor Name</th>
                  <th>Type</th>
                  <th>Linked Member</th>
                  <th>Description</th>
                  <th style={{textAlign:'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sponsors.map(s => (
                  <tr key={s.id}>
                    <td style={{fontWeight:600}}>{s.name}</td>
                    <td>
                      <span className={`badge ${s.type === 'Member' ? 'badge--cyan' : 'badge--amber'}`}>
                        {s.type === 'Member' ? <User size={10} style={{marginRight:4}}/> : <Building size={10} style={{marginRight:4}}/>}
                        {s.type}
                      </span>
                    </td>
                    <td>{s.member_reg ? <span className="badge badge--gray">Reg: {s.member_reg}</span> : '—'}</td>
                    <td className="td-muted" style={{fontSize:12}}>{s.description || '—'}</td>
                    <td style={{textAlign:'right'}}>
                      <button className="btn btn--ghost btn--icon btn--sm" onClick={() => handleDelete(s.id)} style={{color:'var(--red)'}}>
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal__header">
              <div className="modal__title">Add New Sponsor</div>
              <button className="modal__close" onClick={() => setModal(null)}><X size={16}/></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Sponsor Type</label>
                  <div style={{display:'flex', gap:10}}>
                    <label style={{flex:1, cursor:'pointer'}}>
                      <input type="radio" name="type" value="Member" checked={form.type==='Member'} onChange={hc} />
                      <div className={`tab ${form.type==='Member'?'active':''}`} style={{border:'1px solid var(--glass-border)', borderRadius:8, textAlign:'center', padding:10}}>Member</div>
                    </label>
                    <label style={{flex:1, cursor:'pointer'}}>
                      <input type="radio" name="type" value="External" checked={form.type==='External'} onChange={hc} />
                      <div className={`tab ${form.type==='External'?'active':''}`} style={{border:'1px solid var(--glass-border)', borderRadius:8, textAlign:'center', padding:10}}>External Entity</div>
                    </label>
                  </div>
                </div>

                {form.type === 'Member' ? (
                  <div className="form-group">
                    <label className="form-label">Search Member</label>
                    <div style={{position:'relative'}}>
                      <input 
                        className="form-input" 
                        placeholder="Name or Reg No..." 
                        value={memberSearch} 
                        onChange={e => setMemberSearch(e.target.value)}
                      />
                      <Search size={16} style={{position:'absolute', right:12, top:12, color:'var(--text-muted)'}}/>
                      {filteredMembers.length > 0 && (
                        <div className="search-dropdown" style={{position:'absolute', top:'100%', left:0, right:0, zIndex:10, background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:8, marginTop:4, maxHeight:200, overflowY:'auto'}}>
                          {filteredMembers.map(m => (
                            <div 
                              key={m.id} 
                              className="search-item" 
                              onClick={() => {
                                setForm({ ...form, name: m.full_name, member_id: m.id })
                                setMemberSearch('')
                              }}
                              style={{padding:10, cursor:'pointer', borderBottom:'1px solid var(--glass-border)'}}
                            >
                              <div style={{fontWeight:600}}>{m.full_name}</div>
                              <div style={{fontSize:11, color:'var(--text-muted)'}}>Reg No: {m.reg_no}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {form.member_id && (
                      <div style={{marginTop:10, padding:10, background:'var(--accent-dim)', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>Selected: <strong>{form.name}</strong></div>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm({...form, name:'', member_id:null})}>Change</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Sponsor Name</label>
                    <input className="form-input" name="name" value={form.name} onChange={hc} placeholder="Organization or Individual name" required />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes / Description</label>
                  <textarea className="form-textarea" name="description" value={form.description} onChange={hc} placeholder="e.g., Donated on Annual Day 2024" />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn--primary">Save Sponsor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        input[type="radio"] { display: none; }
        .search-item:hover { background: rgba(0,0,0,0.02); }
      `}</style>
    </div>
  )
}
