import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, User, CreditCard, History, CheckCircle, Contact, Printer } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../App.jsx'
import MemberIDCard from '../components/MemberIDCard.jsx'
import PhotoCropper from '../components/PhotoCropper.jsx'
import { sendWhatsAppNotification } from '../utils/notifications'

const ID_TYPES = ['Aadhaar','Voter ID','Driving License','PAN Card','Ration Card','Passport','Other']
const MEMBER_TYPES = ['Permanent', 'General']
const STATUSES = ['Active','Suspended','Expired','Terminated']
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']
const GENDERS = ['Male','Female','Other']

export default function Members() {
  const { settings, t, language } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [members, setMembers] = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [selected, setSel]    = useState(null)
  const [history, setHistory] = useState([])
  const [toast, setToast]     = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [stats, setStats]               = useState(null)
  const [cropImage, setCropImage]       = useState(null)


  const form0 = { full_name:'',full_name_ml:'',phone:'',whatsapp:'',id_card_type:'Aadhaar',id_card_no:'',address:'',address_ml:'',photo:'',dob:'',gender:'Male',blood_group:'Unknown',occupation:'',email:'',member_type:'General',fee_paid:0,fee_amount:'' }
  const [form, setForm] = useState(form0)
  const [reservedCount, setReservedCount] = useState(0)

  useEffect(() => { load() }, [search, filterStatus, filterType])

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAdd()
      setSearchParams({})
    }
  }, [searchParams])

  async function load() {
    setLoading(true)
    const rows = search ? await window.api.searchMembers(search)
      : await window.api.getMembers({ status: filterStatus||undefined, member_type: filterType||undefined })
    setMembers(rows); setLoading(false)
  }

  function toast2(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }
  async function openAdd() {
    const nextReg = await window.api.getNextRegNo()
    const reserved = await window.api.getReservedCount()
    setReservedCount(reserved)
    setForm({...form0, reg_no: nextReg})
    setModal('add')
  }
  function openEdit(m) { setForm({...m}); setSel(m); setModal('edit') }

  async function openProfile(m) {
    setSel(m)
    const h = await window.api.getMemberHistory(m.id)
    const s = await window.api.getMemberAnalytics(m.id)
    setHistory(h)
    setStats(s)
    setModal('profile')
  }

  async function pickPhoto() {
    const data = await window.api.pickImage()
    if (data) setCropImage(data)
  }

  function handleCropComplete(cropped) {
    setForm(p => ({ ...p, photo: cropped }))
    setCropImage(null)
  }


  function hc(e) { const {name,value,type,checked}=e.target; setForm(p=>({...p,[name]:type==='checkbox'?checked:value})) }

  async function handleSave() {
    if (!form.full_name) { toast2('Full name is required','error'); return }
    if (!form.phone)     { toast2('Phone number is required','error'); return }
    if (!form.id_card_no){ toast2('ID card number is required','error'); return }
    const feeKey = `membership_fee_${(form.member_type||'yearly').toLowerCase()}`
    const defaultFee = settings[feeKey] || settings.membership_fee_yearly || 1000
    const feeAmt = form.fee_amount || defaultFee
    const data = {...form, fee_amount: parseFloat(feeAmt)}
    const res = modal==='add' ? await window.api.addMember(data) : await window.api.updateMember(selected.id, data)
    if (res.success) {
      toast2(modal==='add' ? `Member added! Reg: ${res.reg_no}` : 'Member updated!')
      if (modal === 'add') {
        sendWhatsAppNotification({ ...form, reg_no: res.reg_no }, 'registration', {}, { language, settings })
      }
      setModal(null); load()
    } else toast2(res.message||'Error','error')
  }

  async function payFee(m) {
    const feeKey = `membership_fee_${(m.member_type||'yearly').toLowerCase()}`
    const fee = parseFloat(settings[feeKey] || settings.membership_fee_yearly || 1000)
    const res = await window.api.payMemberFee(m.id, fee)
    if (res.success) { 
      toast2(`Fee ₹${fee} collected!`); 
      sendWhatsAppNotification(m, 'fee', { amount: fee, type: 'Membership Fee' }, { language, settings })
      load() 
    }
    else toast2('Error','error')
  }

  async function handleDelete(m) {
    if (!confirm(`Delete member "${m.full_name}"?`)) return
    const res = await window.api.deleteMember(m.id)
    if (res.success) { toast2('Member deleted'); load() }
    else toast2('Error','error')
  }

  async function payFine(m) {
    const amt = prompt(`Enter amount to pay (Balance: ₹${m.fine_balance})`, m.fine_balance)
    if (!amt || isNaN(amt)) return
    const res = await window.api.addPayment({ member_id: m.id, type: 'fine', amount: parseFloat(amt), notes: 'Fine payment' })
    if (res.success) {
      await window.api.updateMemberFine(m.id, -parseFloat(amt))
      toast2(`Fine ₹${amt} collected!`)
      sendWhatsAppNotification(m, 'fee', { amount: parseFloat(amt), type: 'Fine Payment' }, { language, settings })
      const updated = await window.api.getMember(m.id)
      setSel(updated)
      const s = await window.api.getMemberAnalytics(m.id)
      setStats(s)
      load()
    }
  }
  
  function printMembers() {
    window.print()
  }

  function getFeeForType(type) {
    if (type === 'Permanent') return settings.membership_fee_permanent || 2000
    if (type === 'General') return settings.membership_fee_general_reg || 200
    return 0
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">
          <span className="lang-en">Members</span>
          <span className="lang-ml">അംഗങ്ങൾ</span>
        </h1>
        <p className="page-header__sub lang-en">Member registration and management</p>
        <p className="page-header__sub lang-ml">അംഗങ്ങളുടെ രജിസ്ട്രേഷനും മറ്റ് വിവരങ്ങളും</p>
        <div className="page-header__actions">
          <div className="search-bar" style={{flex:1,maxWidth:360}}>
            <Search size={15} className="search-icon"/>
            <input placeholder="Search name, phone, ID, reg no…" value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}><X size={14}/></button>}
          </div>
          <select className="form-select" style={{width:140}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select className="form-select" style={{width:140}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {MEMBER_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <button className="btn btn--secondary" onClick={printMembers}>
            <Printer size={15}/>
            <span className="lang-en">Print List</span>
            <span className="lang-ml">പ്രിന്റ് ചെയ്യുക</span>
          </button>
          <button className="btn btn--primary" onClick={openAdd}>
            <Plus size={15}/>
            <span className="lang-en">Register Member</span>
            <span className="lang-ml">അംഗത്തെ ചേർക്കുക</span>
          </button>
        </div>
      </div>

      <div style={{display:'flex',gap:16,marginBottom:20}}>
        {[
          {l:'Total',v:members.length,c:'var(--accent)'},
          {l:'Active',v:members.filter(m=>m.status==='Active').length,c:'var(--green)'},
          {l:'Fee Paid',v:members.filter(m=>m.fee_paid).length,c:'var(--cyan)'},
          {l:'Fee Unpaid',v:members.filter(m=>!m.fee_paid).length,c:'var(--amber)'},
        ].map(s=>(
          <div key={s.l} className="card" style={{flex:1,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'var(--text-muted)'}}>{s.l}</span>
            <span style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div className="table-wrap">
          {loading ? <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Loading…</div>
          : members.length===0 ? (
            <div className="empty-state"><div className="empty-state__icon">👥</div><div className="empty-state__title">No members found</div></div>
          ) : (
            <table>
              <thead><tr><th>Reg No.</th><th>Name</th><th>Gender</th><th>Blood</th><th>Phone</th><th>Type</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {members.map(m=>(
                  <tr key={m.id}>
                    <td><span className="badge badge--accent">{m.reg_no}</span></td>
                    <td>
                      <div style={{fontWeight:600}}>{language === 'ml' && m.full_name_ml ? m.full_name_ml : m.full_name}</div>
                      {language === 'en' && m.full_name_ml && <div className="td-muted lang-ml" style={{fontSize:12}}>{m.full_name_ml}</div>}
                    </td>
                    <td className="td-muted">{m.gender}</td>
                    <td style={{color:'var(--red)', fontWeight:700}}>{m.blood_group}</td>
                    <td className="td-muted">{m.phone}</td>
                    <td><span className="badge badge--gray">{m.member_type}</span></td>
                    <td>
                      {m.fee_paid
                        ? <span className="badge badge--green"><CheckCircle size={11}/> ₹{m.fee_amount}</span>
                        : <button className="btn btn--amber btn--sm" onClick={()=>payFee(m)}>Pay ₹{getFeeForType(m.member_type)}</button>
                      }
                    </td>
                    <td><span className={`badge ${m.status==='Active'?'badge--green':m.status==='Suspended'?'badge--red':m.status==='Terminated'?'badge--red':'badge--gray'}`}>{m.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>setModal({type:'card',member:m})} title="ID Card" style={{color:'var(--accent)'}}><Contact size={14}/></button>
                        <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>openProfile(m)} title="Profile & Analytics"><User size={14}/></button>
                        <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>openEdit(m)} title="Edit"><Edit2 size={14}/></button>
                        <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>handleDelete(m)} title="Delete" style={{color:'var(--red)'}}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal==='add'||modal==='edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal modal--wide" onClick={e=>e.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title">{modal==='add'?'👤 Register New Member':'✏️ Edit Member'}</div>
              <button className="modal__close" onClick={()=>setModal(null)}><X size={16}/></button>
            </div>
            <div className="modal__body">
              {/* Photo */}
              <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
                <div className="photo-upload" onClick={pickPhoto} style={{width:120}}>
                  {form.photo
                    ? <img src={form.photo} alt="photo" className="photo-preview"/>
                    : <><User size={32} color="var(--text-muted)"/><span style={{fontSize:12,color:'var(--text-muted)'}}>Click to add photo</span></>
                  }
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group form-full"><label className="form-label">{t('full_name')} *</label><input className="form-input" name="full_name" value={form.full_name} onChange={hc} placeholder="Full name"/></div>


                <div className="form-group"><label className="form-label">Membership ID</label>
                  <input className="form-input" name="reg_no" value={form.reg_no || ''} onChange={hc} disabled={form.reg_no && members.length >= reservedCount} placeholder="ID..." style={{fontWeight:600, color:'var(--accent)'}}/>
                </div>
                <div className="form-group"><label className="form-label">{t('phone')} *</label><input className="form-input" name="phone" value={form.phone} onChange={hc} placeholder="Mobile number"/></div>
                
                <div className="form-group"><label className="form-label">Gender</label><select className="form-select" name="gender" value={form.gender||'Male'} onChange={hc}>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Blood Group</label><select className="form-select" name="blood_group" value={form.blood_group||'Unknown'} onChange={hc}>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></div>
                
                <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" name="whatsapp" value={form.whatsapp||''} onChange={hc} placeholder="WhatsApp"/></div>
                <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" name="dob" value={form.dob||''} onChange={hc}/></div>
                
                <div className="form-group"><label className="form-label">ID Type</label><select className="form-select" name="id_card_type" value={form.id_card_type||'Aadhaar'} onChange={hc}>{ID_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label className="form-label">ID Number</label><input className="form-input" name="id_card_no" value={form.id_card_no} onChange={hc} placeholder="ID number"/></div>
                
                <div className="form-group"><label className="form-label">Occupation</label><input className="form-input" name="occupation" value={form.occupation||''} onChange={hc}/></div>
                <div className="form-group"><label className="form-label">{t('member_type')}</label><select className="form-select" name="member_type" value={form.member_type||'General'} onChange={hc}>{MEMBER_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" name="email" value={form.email||''} onChange={hc}/></div>
                <div className="form-group"><label className="form-label">Status</label><select className="form-select" name="status" value={form.status||'Active'} onChange={hc}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
                
                <div className={`form-group ${members.length < reservedCount ? 'form-full' : ''}`}>
                  <label className="form-label">Reg. Fee (₹)</label>
                  <input className="form-input" type="number" name="fee_amount" value={form.fee_amount||getFeeForType(form.member_type)} disabled style={{background:'var(--bg-primary)', cursor:'not-allowed'}}/>
                </div>
                {members.length >= reservedCount && (
                  <div className="form-group">
                    <label className="form-label">Registration Date</label>
                    <input className="form-input" value={form.membership_start||'Today'} disabled style={{background:'var(--bg-primary)'}}/>
                  </div>
                )}
                <div className="form-group form-full"><label className="form-label">{t('address')}</label>
                  <input className="form-input" name="address" value={form.address||''} onChange={hc} placeholder="Address"/>
                </div>

              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>{modal==='add'?'Register Member':'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {modal==='profile' && selected && stats && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal modal--wide">
            <div className="modal__header">
              <div className="modal__title">👤 Member Profile & Analytics</div>
              <button className="modal__close" onClick={()=>setModal(null)}><X size={16}/></button>
            </div>
            <div className="modal__body">
              <div style={{display:'flex', gap:24, marginBottom:24}}>
                <div style={{width:140, height:160, background:'var(--bg-primary)', borderRadius:8, overflow:'hidden', flexShrink:0, border:'1px solid var(--glass-border)'}}>
                  {selected.photo ? <img src={selected.photo} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}><User size={48} color="var(--text-muted)"/></div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:24, fontWeight:700, marginBottom:4}}>{selected.full_name}</div>
                  <div style={{fontSize:14, color:'var(--accent)', fontWeight:600, marginBottom:12}}>{selected.reg_no} · {selected.member_type}</div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                    <div><span className="td-muted">Phone:</span> {selected.phone}</div>
                    <div><span className="td-muted">Joined:</span> {selected.membership_start}</div>
                    <div><span className="td-muted">Status:</span> <span className={`badge ${selected.status==='Active'?'badge--green':'badge--red'}`}>{selected.status}</span></div>
                    <div><span className="td-muted">Expiry:</span> {selected.membership_expiry}</div>
                  </div>
                </div>
              </div>

              <div className="stats-grid" style={{gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:24}}>
                <div className="card" style={{padding:16}}>
                  <div className="td-muted" style={{fontSize:12}}>Books Borrowed</div>
                  <div style={{fontSize:20, fontWeight:700}}>{stats.borrowedCount}</div>
                </div>
                <div className="card" style={{padding:16}}>
                  <div className="td-muted" style={{fontSize:12}}>Current Holding</div>
                  <div style={{fontSize:20, fontWeight:700}}>{stats.activeCount}</div>
                </div>
                <div className="card" style={{padding:16}}>
                  <div className="td-muted" style={{fontSize:12}}>Fines Paid</div>
                  <div style={{fontSize:20, fontWeight:700, color:'var(--green)'}}>₹{stats.paidFines}</div>
                </div>
                <div className="card" style={{padding:16, borderLeft:'4px solid var(--red)', position:'relative'}}>
                  <div className="td-muted" style={{fontSize:12}}>Unpaid Fine</div>
                  <div style={{fontSize:20, fontWeight:700, color:'var(--red)'}}>₹{selected.fine_balance}</div>
                  {selected.fine_balance > 0 && <button className="btn btn--primary btn--sm" style={{position:'absolute', right:16, top:20}} onClick={()=>payFine(selected)}>Pay</button>}
                </div>
              </div>

              <div style={{fontWeight:700, marginBottom:12, fontSize:15}}>📚 Borrowing History</div>
              <div className="table-wrap" style={{maxHeight:300, overflowY:'auto'}}>
                <table>
                  <thead><tr><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th><th>Status</th></tr></thead>
                  <tbody>
                    {history.map(h=>(
                      <tr key={h.id}>
                        <td><div style={{fontWeight:600}}>{h.title}</div></td>
                        <td className="td-muted">{h.issue_date}</td>
                        <td className="td-muted">{h.due_date}</td>
                        <td className="td-muted">{h.return_date||'—'}</td>
                        <td style={{color:h.fine_amount>0?'var(--red)':'inherit'}}>{h.fine_amount>0?`₹${h.fine_amount}`:'—'}</td>
                        <td><span className={`badge ${h.status==='Returned'?'badge--green':h.status==='Overdue'?'badge--red':'badge--amber'}`}>{h.status}</span></td>
                      </tr>
                    ))}
                    {history.length===0 && <tr><td colSpan="6" style={{textAlign:'center', padding:20}} className="td-muted">No history found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal__footer"><button className="btn btn--ghost" onClick={()=>setModal(null)}>Close Profile</button></div>
          </div>
        </div>
      )}

      {modal?.type === 'card' && (
        <MemberIDCard 
          member={modal.member} 
          settings={settings} 
          onClose={() => setModal(null)} 
        />
      )}

      {cropImage && (
        <PhotoCropper 
          image={cropImage} 
          onCropComplete={handleCropComplete} 
          onCancel={() => setCropImage(null)} 
        />
      )}


      {toast && <div className="toast-container"><div className={`toast toast--${toast.type}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div></div>}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .sidebar, .page-header__actions, .btn, .title-bar, .toast-container { display: none !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #eee !important; padding: 8px !important; text-align: left !important; font-size: 10px !important; }
          .badge { border: 1px solid #ccc !important; color: #000 !important; }
        }
      `}}/>
    </div>
  )
}
