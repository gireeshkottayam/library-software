import React, { useState, useEffect, useRef } from 'react'
import { Save, Shield, Download, Upload, Plus, Trash2, User, RefreshCw, CheckCircle, Key, ShieldAlert, Image as ImageIcon } from 'lucide-react'
import { useAuth, useSettings } from '../App.jsx'
import { useSearchParams } from 'react-router-dom'
import PhotoCropper from '../components/PhotoCropper.jsx'

export default function Settings() {
  const { user } = useAuth()
  const { settings, loadSettings, licenseInfo, setActivated, language } = useSettings()
  const [searchParams] = useSearchParams()
  const [form, setForm]     = useState({})
  const [saved, setSaved]   = useState(false)
  const [tab, setTab]       = useState(searchParams.get('tab') || 'library')
  const [toast, setToast]   = useState(null)
  const [users, setUsers]   = useState([])
  const [newUser, setNewUser] = useState({ username:'', password:'', role:'librarian', full_name:'' })
  const [editingUser, setEditingUser] = useState(null)
  const [pwForm, setPwForm]   = useState({ old:'', new1:'', new2:'' })
  const [sigRaw, setSigRaw]   = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  
  const [waStatus, setWaStatus] = useState('DISCONNECTED')
  const [waQR, setWaQR] = useState(null)

  useEffect(() => {
    window.api.getWhatsAppStatus().then(s => setWaStatus(s))
    
    window.api.onWhatsAppQR(qr => {
      setWaQR(qr)
      setWaStatus('QR_RECEIVED')
    })
    
    window.api.onWhatsAppStatus(s => {
      setWaStatus(s)
      if (s === 'CONNECTED') setWaQR(null)
    })
  }, [])

  useEffect(() => { setForm({...settings}) }, [settings])
  useEffect(() => { 
    if (tab==='users') loadUsers() 
    if (tab==='backup') loadBackupPath()
    if (tab==='publishers') loadPublishers()
  }, [tab])

  const [publishers, setPublishers] = useState([])
  const [newPub, setNewPub] = useState({ name: '', place: '' })

  async function loadPublishers() {
    const p = await window.api.getPublishers()
    setPublishers(p)
  }

  async function addPub() {
    if (!newPub.name) return
    const res = await window.api.addPublisher(newPub)
    if (res.success) {
      setNewPub({ name: '', place: '' })
      loadPublishers()
      toast2('Publisher added!')
    } else {
      toast2(res.message, 'error')
    }
  }

  async function delPub(id) {
    if (!confirm('Delete this publisher?')) return
    await window.api.deletePublisher(id)
    loadPublishers()
  }

  const [backupPath, setBPath] = useState('')
  const [amountReport, setAmountReport] = useState(null)
  const [amountBusy, setAmountBusy] = useState(false)
  const toastTimer = useRef(null)
  async function loadBackupPath() {
    const p = await window.api.getBackupPath()
    setBPath(p)
  }

  async function loadUsers() {
    const u = await window.api.getUsers(); setUsers(u)
  }

  function toast2(msg, type='success') {
    setToast({msg,type})
    // The timer of the message before must not clear this one.
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(()=>setToast(null),3000)
  }
  function hc(e) { setForm(p=>({...p,[e.target.name]:e.target.value})) }

  function handleSig(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSigRaw(reader.result)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }

  function onSigCrop(croppedData) {
    setForm(p => ({ ...p, library_signature: croppedData }))
    setShowCropper(false)
    setSigRaw(null)
  }

  function handleLoginBg(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm(p => ({ ...p, login_bg: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  async function saveAll() {
    try {
      for (const [k,v] of Object.entries(form)) {
        await window.api.setSetting(k, v)
      }
      await loadSettings()
      setSaved(true); setTimeout(()=>setSaved(false),2000)
      toast2('Settings saved successfully!')
    } catch (err) {
      console.error(err)
      toast2('Error saving settings', 'error')
    }
  }

  async function handleBackup() {
    const res = await window.api.createBackup()
    if (res.success) toast2(`Backup saved to: ${res.path}`)
    else if (res.message && res.message !== 'cancelled') toast2(`Backup failed: ${res.message}`,'error')
    else toast2('Backup cancelled','error')
  }

  async function handleRestore() {
    // The confirmation with the details of the backup is shown by the main
    // process: only there is it known what the picked file really holds.
    const res = await window.api.restoreBackup(language)
    if (!res) return
    if (res.success) {
      // The app restarts itself, so this only shows when the restart fails.
      toast2(`Backup restored: ${res.books} book(s)`, 'success')
    } else if (res.message && res.message !== 'cancelled') {
      toast2(`Restore failed: ${res.message}`, 'error')
    }
  }

  async function handleRestoreLatest() {
    const res = await window.api.restoreLatestBackup(language)
    if (!res) return
    if (res.success) {
      toast2(`Automatic backup restored: ${res.books} book(s)`, 'success')
    } else if (res.message && res.message !== 'cancelled') {
      toast2(`Restore failed: ${res.message}`, 'error')
    }
  }

  // Look for the amounts of the books that have none and write them in.
  // The librarian does not have to restore a backup to get them back.
  async function handleRecoverAmounts(fromFile) {
    setAmountBusy(true)
    try {
      const res = fromFile
        ? await window.api.recoverAmountsFromFile()
        : await window.api.recoverAmounts()
      if (!res) return
      if (res.message === 'cancelled') return
      if (!res.success) { toast2(`Could not look for the amounts: ${res.message}`, 'error'); return }
      setAmountReport(res)
      if (res.recovered > 0) toast2(`${res.recovered} amount(s) found again`, 'success')
      else toast2('No amount was found in the places that were looked at', 'error')
    } catch (err) {
      console.error(err)
      toast2('Looking for the amounts failed', 'error')
    } finally {
      setAmountBusy(false)
    }
  }

  async function addUser() {
    if (!newUser.username || !newUser.password || !newUser.full_name) { toast2('Fill all user fields','error'); return }
    const res = await window.api.addUser(newUser)
    if (res.success) { toast2('User added!'); setNewUser({username:'',password:'',role:'librarian',full_name:''}); loadUsers() }
    else toast2('Error adding user','error')
  }

  async function delUser(id) {
    if (!confirm('Delete this user?')) return
    await window.api.deleteUser(id); loadUsers()
  }

  async function updateUser() {
    if (!editingUser.username || !editingUser.full_name) { toast2('Fill required fields','error'); return }
    const res = await window.api.updateUser(editingUser.id, editingUser)
    if (res.success) {
      toast2('User updated!');
      setEditingUser(null);
      loadUsers();
    } else {
      toast2(res.message || 'Error updating user', 'error');
    }
  }

  async function changePassword() {
    if (!pwForm.old || !pwForm.new1 || !pwForm.new2) { toast2('Fill all password fields','error'); return }
    if (pwForm.new1 !== pwForm.new2) { toast2('New passwords do not match','error'); return }
    const res = await window.api.changePassword(user.id, pwForm.old, pwForm.new1)
    if (res.success) { toast2('Password changed!'); setPwForm({old:'',new1:'',new2:''}) }
    else toast2(res.message||'Error','error')
  }

  const Label = ({children}) => <label className="form-label">{children}</label>
  const Input = ({name,...rest}) => <input className="form-input" name={name} value={form[name]||''} onChange={hc} {...rest}/>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">
          <span className="lang-en">Settings</span>
          <span className="lang-ml">ക്രമീകരണങ്ങൾ</span>
        </h1>
        <p className="page-header__sub">
          <span className="lang-en">Configure library rules, fees, and system preferences</span>
          <span className="lang-ml">ഗ്രന്ഥശാലയിലെ നിയമങ്ങൾ, ഫീസുകൾ, മറ്റ് ക്രമീകരണങ്ങൾ മാറ്റം വരുത്തുക</span>
        </p>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={saveAll}><Save size={15}/>{saved?'Saved!':'Save All Settings'}</button>
        </div>
      </div>

      <div className="tabs">
        {['library','rules','fees','notifications','users','publishers','backup','license'].map(t=>(
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
            <span className="lang-en">{t==='library'?'🏛 Library':t==='rules'?'📋 Rules':t==='fees'?'💰 Fees':t==='notifications'?'🔔 Notifications':t==='users'?'👥 Users':t==='publishers'?'🏢 Publishers':t==='backup'?'💾 Backup':'🔑 License'}</span>
            <span className="lang-ml">{t==='library'?'🏛 വിവരം':t==='rules'?'📋 നിയമങ്ങൾ':t==='fees'?'💰 ഫീസ്':t==='notifications'?'🔔 അറിയിപ്പുകൾ':t==='users'?'👥 യൂസേഴ്സ്':t==='publishers'?'🏢 പബ്ലിഷേഴ്സ്':t==='backup'?'💾 ബാക്കപ്പ്':'🔑 ലൈസൻസ്'}</span>
          </button>
        ))}
      </div>

      {/* Library Info */}
      {tab==='library' && (
        <div className="card">
          <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:'var(--accent-light)'}}>🏛 Library Information</div>
          <div className="form-grid">
            <div className="form-group">
              <Label>Library Name (English)</Label>
              <Input name="library_name" placeholder="Public Library Kooroppada"/>
            </div>
            <div className="form-group">
              <Label>Address</Label>
              <Input name="library_address" placeholder="Kooroppada, Kerala"/>
            </div>
            <div className="form-group">
              <Label>Phone Number</Label>
              <Input name="library_phone" placeholder="+91 ..."/>
            </div>
            <div className="form-group">
              <Label>Library Reg. No.</Label>
              <Input name="library_reg_no" placeholder="123"/>
            </div>
            <div className="form-group">
              <Label>Registration Year</Label>
              <Input name="library_reg_year" placeholder="1980"/>
            </div>
            <div className="form-group">
              <Label>Reserved Reg. Count</Label>
              <Input name="reserved_reg_count" type="number" placeholder="300"/>
              <span style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>Manual ID entry for first N members</span>
            </div>
            <div className="form-group">
              <Label>Library Place</Label>
              <Input name="library_place" placeholder="KOOROPPADA"/>
            </div>
            <div className="form-group">
              <Label>Library Email</Label>
              <Input name="library_email" placeholder="lib@example.com"/>
            </div>
            <div className="form-group">
              <Label>Website</Label>
              <Input name="library_website" placeholder="https://"/>
            </div>
            <div className="form-group">
              <Label>Recovery Security Code</Label>
              <Input name="security_code" placeholder="Enter a secret code" type="password"/>
              <span style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>Used to reset admin credentials from login page</span>
            </div>
          </div>
          <div style={{marginTop:30, paddingTop:20, borderTop:`1px solid var(--accent-dim)`}}>
            <Label>Secretary Signature</Label>
            <div style={{display:'flex', alignItems:'center', gap:20, marginTop:10}}>
              <div style={{
                width: 200, height: 80, 
                border: '2px dashed var(--accent-dim)', 
                borderRadius: 'var(--radius)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', background: '#fff'
              }}>
                {form.library_signature ? (
                  <img src={form.library_signature} style={{width:'100%', height:'100%', objectFit:'contain'}} />
                ) : (
                  <ImageIcon size={30} color="var(--text-muted)" />
                )}
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                <label className="btn btn--secondary" style={{cursor:'pointer'}}>
                  <Upload size={14}/> Upload Signature
                  <input type="file" hidden accept="image/*" onChange={handleSig} />
                </label>
                <span style={{fontSize:11, color:'var(--text-muted)'}}>Recommended: Transparent PNG (3:1 aspect ratio)</span>
              </div>
            </div>
          </div>

          <div style={{marginTop:30, paddingTop:20, borderTop:`1px solid var(--accent-dim)`}}>
            <Label>Login Page Background</Label>
            <div style={{display:'flex', alignItems:'center', gap:20, marginTop:10}}>
              <div style={{
                width: 200, height: 120, 
                border: '2px dashed var(--accent-dim)', 
                borderRadius: 'var(--radius)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', background: '#f5f5f5'
              }}>
                {form.login_bg ? (
                  <img src={form.login_bg} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                ) : (
                  <ImageIcon size={30} color="var(--text-muted)" />
                )}
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                <label className="btn btn--secondary" style={{cursor:'pointer'}}>
                  <Upload size={14}/> Upload Background
                  <input type="file" hidden accept="image/*" onChange={handleLoginBg} />
                </label>
                <span style={{fontSize:11, color:'var(--text-muted)'}}>Recommended: 1920x1080 Landscape Image</span>
              </div>
            </div>
          </div>

          <div style={{marginTop:20,padding:'14px',background:'var(--accent-dim)',borderRadius:'var(--radius)',fontSize:12,color:'var(--accent-light)'}}>
            ℹ This information will appear on printed ID cards, receipts and reports.
          </div>

          {showCropper && (
            <PhotoCropper 
              image={sigRaw} 
              aspect={3 / 1} 
              title="Crop Secretary Signature"
              onCropComplete={onSigCrop} 
              onCancel={() => setShowCropper(false)} 
            />
          )}
        </div>
      )}

      {/* Borrowing Rules */}
      {tab==='rules' && (
        <div className="card">
          <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:'var(--accent-light)'}}>📋 Borrowing Rules</div>
          <div className="form-grid">
            <div className="form-group">
              <Label>Borrowing Period (days)</Label>
              <Input name="borrow_days" type="number" min="1" max="90" placeholder="14"/>
              <span style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>Number of days a member can keep a book</span>
            </div>
            <div className="form-group">
              <Label>Max Books per Member</Label>
              <Input name="max_books" type="number" min="1" max="20" placeholder="3"/>
              <span style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>Maximum books a member can borrow at once</span>
            </div>
            <div className="form-group">
              <Label>Fine per Day (₹)</Label>
              <Input name="fine_per_day" type="number" min="0" step="0.5" placeholder="2"/>
              <span style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>Amount charged per day after due date</span>
            </div>
            <div className="form-group">
              <Label>Renewal Allowed</Label>
              <select className="form-select" name="renew_allowed" value={form.renew_allowed||'1'} onChange={hc}>
                <option value="1">Yes — 1 renewal per book</option>
                <option value="0">No renewals allowed</option>
              </select>
            </div>

          </div>
          <div style={{marginTop:20,background:'var(--amber-dim)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'var(--radius)',padding:'14px',fontSize:12,color:'var(--amber)'}}>
            ⚡ Current: {form.borrow_days||14} days · ₹{form.fine_per_day||2}/day fine · Max {form.max_books||3} books
          </div>
        </div>
      )}

      {/* Fees */}
      {tab==='fees' && (
        <div className="card">
          <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:'var(--accent-light)'}}>💰 Membership Fees</div>
          <div className="form-grid">
            {[
              {key:'membership_fee_permanent',label:'Permanent Member Fee (₹)',hint:'One-time payment, Lifetime access'},
              {key:'membership_fee_general_reg',label:'General Member Reg. Fee (₹)',hint:'Initial registration fee'},
              {key:'membership_fee_general_monthly',label:'General Monthly Fee (₹)',hint:'Recurring monthly payment'},
            ].map(f=>(
              <div className="form-group" key={f.key}>
                <Label>{f.label}</Label>
                <input className="form-input" name={f.key} type="number" min="0" value={form[f.key]||''} onChange={hc} placeholder="0"/>
                <span style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{f.hint}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,background:'var(--green-dim)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'var(--radius)',padding:'14px',fontSize:12,color:'var(--green)'}}>
            💡 Fees are collected at registration. Admin can manually override per member.
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab==='notifications' && (
        <div className="card">
          <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:'var(--accent-light)'}}>🔔 Notification Settings</div>
          
          <div style={{marginBottom:24, padding:'24px', background:'var(--bg-elevated)', borderRadius:12, border:'1px solid var(--glass-border)'}}>
            <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:20}}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'var(--green-dim)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)'
              }}>
                <RefreshCw size={24} className={waStatus === 'INITIALIZING' ? 'spin' : ''}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:16}}>Local WhatsApp Bridge</div>
                <div style={{fontSize:13, color: waStatus === 'CONNECTED' ? 'var(--green)' : 'var(--text-muted)'}}>
                  Status: {waStatus.replace('_', ' ')}
                </div>
              </div>
              {waStatus === 'DISCONNECTED' && (
                <button className="btn btn--primary" onClick={() => window.api.initWhatsApp()}>Connect WhatsApp</button>
              )}
            </div>

            {waStatus === 'QR_RECEIVED' && waQR && (
              <div style={{textAlign:'center', padding:20, background:'#fff', borderRadius:12, width:'fit-content', margin:'0 auto 20px'}}>
                <img src={waQR} alt="WhatsApp QR" style={{width:200, height:200}}/>
                <div style={{color:'#000', fontSize:12, fontWeight:600, marginTop:10}}>Scan this QR with WhatsApp</div>
              </div>
            )}

            {waStatus === 'CONNECTED' && (
              <div style={{padding:'12px 16px', background:'var(--green-dim)', color:'var(--green)', borderRadius:8, fontSize:13, display:'flex', alignItems:'center', gap:10, marginBottom:20}}>
                <CheckCircle size={16}/> WhatsApp is connected and ready for automated notifications.
              </div>
            )}

            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', background:'var(--bg-primary)', borderRadius:12}}>
              <div>
                <div style={{fontWeight:600}}>Automatic Sending</div>
                <div style={{fontSize:12, color:'var(--text-muted)'}}>Send messages in background without manual confirmation</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={form.whatsapp_auto_send === '1'} onChange={e => setForm({...form, whatsapp_auto_send: e.target.checked ? '1' : '0'})} />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <Label>Notification Provider</Label>
              <select className="form-select" name="whatsapp_provider" value={form.whatsapp_provider || 'local'} onChange={hc}>
                <option value="local">Local Bridge (Free / Unlimited)</option>
                <option value="ultramsg">Ultramsg (Cloud API)</option>
              </select>
            </div>
          </div>

          {form.whatsapp_provider === 'ultramsg' && (
            <div className="form-grid" style={{marginTop:20}}>
              <div className="form-group">
                <Label>Instance ID</Label>
                <Input name="whatsapp_instance_id" placeholder="e.g. instance12345"/>
              </div>
              <div className="form-group">
                <Label>API Token</Label>
                <Input name="whatsapp_token" type="password" placeholder="Token..."/>
              </div>
            </div>
          )}

          <div style={{marginTop:30, paddingTop:20, borderTop:'1px solid var(--glass-border)'}}>
            <div style={{fontWeight:600, marginBottom:12}}>Message Configuration</div>
            <div className="form-grid">
              <div className="form-group">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <Label>Registration Alert</Label>
                  <input type="checkbox" checked={form.notify_registration !== '0'} onChange={e => setForm({...form, notify_registration: e.target.checked ? '1' : '0'})} />
                </div>
              </div>
              <div className="form-group">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <Label>Borrow/Return Alerts</Label>
                  <input type="checkbox" checked={form.notify_borrowing !== '0'} onChange={e => setForm({...form, notify_borrowing: e.target.checked ? '1' : '0'})} />
                </div>
              </div>
            </div>
          </div>

          <div style={{marginTop:20,background:'var(--accent-dim)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'var(--radius)',padding:'14px',fontSize:12,color:'var(--accent-light)'}}>
            💡 <strong>Setup Guide:</strong> Create an account at <u>ultramsg.com</u>, scan the QR code to connect your WhatsApp, and paste the Instance ID and Token above.
          </div>
        </div>
      )}

      {/* Users */}
      {tab==='users' && user?.role==='superadmin' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <div className="card">
            <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:'var(--accent-light)'}}>👥 Staff Accounts</div>
            <div className="table-wrap" style={{marginBottom:20}}>
              <table>
                <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Created</th><th>Action</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{fontWeight:600}}>{u.full_name}</td>
                      <td className="td-muted">{u.username}</td>
                      <td><span className={`badge ${u.role==='superadmin'?'badge--red':u.role==='librarian'?'badge--accent':'badge--gray'}`}>{u.role}</span></td>
                      <td className="td-muted">{u.created_at?.slice(0,10)}</td>
                      <td>
                        <div style={{display:'flex', gap:6}}>
                          <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>setEditingUser({ ...u, password: '' })} style={{color:'var(--accent-light)'}}>
                            <RefreshCw size={14}/>
                          </button>
                          {u.role !== 'superadmin' && (
                            <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>delUser(u.id)} style={{color:'var(--red)'}}>
                              <Trash2 size={14}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {editingUser ? (
              <div style={{background:'var(--accent-dim)', padding:20, borderRadius:12, marginBottom:20, border:'1px solid var(--accent-light)'}}>
                <div style={{fontWeight:600,marginBottom:12, color:'var(--accent-light)'}}>Edit User: {editingUser.full_name}</div>
                <div className="form-grid">
                  <div className="form-group"><Label>Full Name</Label><input className="form-input" value={editingUser.full_name} onChange={e=>setEditingUser(p=>({...p,full_name:e.target.value}))}/></div>
                  <div className="form-group"><Label>Username</Label><input className="form-input" value={editingUser.username} onChange={e=>setEditingUser(p=>({...p,username:e.target.value}))}/></div>
                  <div className="form-group">
                    <Label>New Password (Optional)</Label>
                    <input className="form-input" type="password" value={editingUser.password} onChange={e=>setEditingUser(p=>({...p,password:e.target.value}))} placeholder="Leave blank to keep current"/>
                  </div>
                  <div className="form-group">
                    <Label>Role</Label>
                    <select className="form-select" value={editingUser.role} onChange={e=>setEditingUser(p=>({...p,role:e.target.value}))} disabled={editingUser.role==='superadmin'}>
                      <option value="superadmin">Super Admin</option>
                      <option value="librarian">Librarian</option>
                      <option value="viewer">Viewer (Read-only)</option>
                    </select>
                  </div>
                </div>
                <div style={{marginTop:16, display:'flex', gap:10}}>
                  <button className="btn btn--primary" onClick={updateUser}><Save size={14}/> Update User</button>
                  <button className="btn btn--ghost" onClick={()=>setEditingUser(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{fontWeight:600,marginBottom:12}}>Add New User</div>
                <div className="form-grid">
                  <div className="form-group"><Label>Full Name</Label><input className="form-input" value={newUser.full_name} onChange={e=>setNewUser(p=>({...p,full_name:e.target.value}))} placeholder="Staff name"/></div>
                  <div className="form-group"><Label>Username</Label><input className="form-input" value={newUser.username} onChange={e=>setNewUser(p=>({...p,username:e.target.value}))} placeholder="login username"/></div>
                  <div className="form-group"><Label>Password</Label><input className="form-input" type="password" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} placeholder="Password"/></div>
                  <div className="form-group"><Label>Role</Label><select className="form-select" value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}><option value="librarian">Librarian</option><option value="viewer">Viewer (Read-only)</option></select></div>
                </div>
                <div style={{marginTop:12}}><button className="btn btn--primary" onClick={addUser}><Plus size={14}/> Add User</button></div>
              </>
            )}
          </div>

          <div className="card">
            <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:'var(--accent-light)'}}>🔒 Change My Password</div>
            <div className="form-grid">
              <div className="form-group"><Label>Current Password</Label><input className="form-input" type="password" value={pwForm.old} onChange={e=>setPwForm(p=>({...p,old:e.target.value}))} placeholder="Current password"/></div>
              <div className="form-group"><Label>New Password</Label><input className="form-input" type="password" value={pwForm.new1} onChange={e=>setPwForm(p=>({...p,new1:e.target.value}))} placeholder="New password"/></div>
              <div className="form-group"><Label>Confirm Password</Label><input className="form-input" type="password" value={pwForm.new2} onChange={e=>setPwForm(p=>({...p,new2:e.target.value}))} placeholder="Confirm new password"/></div>
            </div>
            <div style={{marginTop:12}}><button className="btn btn--amber" onClick={changePassword}><Shield size={14}/> Change Password</button></div>
          </div>
        </div>
      )}

      {tab==='users' && user?.role!=='superadmin' && (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <Shield size={48} color="var(--text-muted)" style={{marginBottom:16}}/>
          <div style={{fontWeight:700,color:'var(--text-muted)'}}>Super Admin access required</div>
        </div>
      )}

      {/* Publishers */}
      {tab==='publishers' && (
        <div className="card">
          <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:'var(--accent-light)'}}>🏢 Manage Publishers</div>
          
          <div style={{display:'flex', gap:10, marginBottom:20}}>
            <input className="form-input" placeholder="Publisher Name" value={newPub.name} onChange={e=>setNewPub({...newPub, name: e.target.value})}/>
            <input className="form-input" placeholder="Place / Location" value={newPub.place} onChange={e=>setNewPub({...newPub, place: e.target.value})}/>
            <button className="btn btn--primary" onClick={addPub}><Plus size={16}/> Add</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Publisher Name</th>
                  <th>Place</th>
                  <th style={{width:80}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {publishers.map(p => (
                  <tr key={p.id}>
                    <td style={{fontWeight:600}}>{p.name}</td>
                    <td className="td-muted">{p.place || '—'}</td>
                    <td>
                      <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>delPub(p.id)} style={{color:'var(--red)'}}>
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {publishers.length === 0 && <tr><td colSpan="3" style={{textAlign:'center', padding:20}} className="td-muted">No publishers added</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Backup */}
      {tab==='backup' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div style={{fontWeight:700,fontSize:15,marginBottom:8,color:'var(--accent-light)'}}><Download size={16} style={{marginRight:8}}/>Create Backup</div>
            <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:16}}>Save a full copy of all library data (books, members, borrowings, payments) to a file. Store on USB drive or cloud storage.</p>
            <button className="btn btn--primary" onClick={handleBackup}><Download size={15}/> Create Backup Now</button>
          </div>
          <div className="card" style={{borderColor:'rgba(239,68,68,0.2)'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8,color:'var(--red)'}}><Upload size={16} style={{marginRight:8}}/>Restore Backup</div>
            <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:16}}>Restore data from a previous backup file. <strong style={{color:'var(--red)'}}>This will overwrite all current data and restart the app.</strong></p>
            <button className="btn btn--red" onClick={handleRestore}><Upload size={15}/> Restore from Backup</button>
          </div>
          <div className="card" style={{background:'var(--accent-dim)',border:'1px solid rgba(99,102,241,0.2)'}}>
            <div style={{fontSize:13,color:'var(--accent-light)'}}>
              💡 <strong>Tip:</strong> Take regular backups especially after busy days. Store backups in at least 2 locations (USB + Google Drive).
            </div>
          </div>

          <div className="card" style={{borderStyle:'dashed'}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
              <CheckCircle size={16} color="var(--green)"/>
              <span>Auto Backup Active</span>
            </div>
            <p style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.5}}>
              Every entry (book add, member update, payment, etc.) is automatically saved as a new file in the background.
              <br/><br/>
              <strong>Location:</strong><br/>
              <code style={{background:'rgba(0,0,0,0.2)',padding:'4px 8px',borderRadius:4,fontSize:11,display:'block',marginTop:6,wordBreak:'break-all'}}>
                {backupPath}
              </code>
            </p>
            <button className="btn" style={{marginTop:12}} onClick={handleRestoreLatest}>
              <Upload size={15}/> Restore the newest automatic backup
            </button>
          </div>

          {/* Amount recovery */}
          <div className="card" style={{borderColor:'rgba(99,102,241,0.25)'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8,color:'var(--accent-light)'}}>
              <RefreshCw size={16} style={{marginRight:8}}/>Find the amounts again
            </div>
            <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:12,lineHeight:1.6}}>
              A backup from an older version of the software holds no book amounts, so restoring it leaves the
              books without one. This looks for the amounts that are still on this computer - in this library
              and in the automatic backups - and writes them into the books that have none. You do not have to
              restore a backup to use it.
              <br/><br/>
              If the amounts are in another file, pick that file and the software will look in it as well: a
              library backup (<code>.db</code>) or a price list exported from a spreadsheet
              (<code>.csv</code>, <code>.txt</code>). A price list is one book per line, with the ISBN or the
              title of the book and its amount.
            </p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button className="btn btn--primary" disabled={amountBusy} onClick={() => handleRecoverAmounts(false)}>
                <RefreshCw size={15}/> {amountBusy ? 'Looking...' : 'Find the amounts again'}
              </button>
              <button className="btn" disabled={amountBusy} onClick={() => handleRecoverAmounts(true)}>
                <Upload size={15}/> Take the amounts from another file
              </button>
            </div>

            {amountReport && (
              <div style={{marginTop:14,padding:12,borderRadius:8,background:'var(--bg-primary)',fontSize:13,lineHeight:1.6}}>
                <div style={{marginBottom:6}}>
                  {amountReport.recovered > 0 ? (
                    <span style={{color:'var(--green)'}}>
                      ✅ {amountReport.recovered} amount{amountReport.recovered === 1 ? '' : 's'} found again and written into the books.
                    </span>
                  ) : (
                    <span style={{color:'var(--red)'}}>
                      No amount was found in the places that were looked at.
                    </span>
                  )}
                </div>
                <div className="td-muted">
                  {amountReport.missingBefore > 0
                    ? `${amountReport.missingBefore} of ${amountReport.books} books had no amount. ${amountReport.missing} still has none.`
                    : `All ${amountReport.books} books have an amount already.`}
                </div>
                {amountReport.sources && amountReport.sources.length > 0 && (
                  <div className="td-muted" style={{marginTop:6}}>
                    Found in: {amountReport.sources.filter(s => s.used > 0).map(s => s.label).join(', ')}
                  </div>
                )}
                <div className="td-muted" style={{marginTop:6}}>
                  {amountReport.filesLookedAt} place{amountReport.filesLookedAt === 1 ? '' : 's'} were looked at: this library and the automatic backups.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* License Info */}
      {tab==='license' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:'var(--accent-light)'}}>🔑 Software License Info</div>
            
            {!licenseInfo?.activated ? (
              <div style={{background:'var(--amber-dim)', border:'1px solid rgba(255,191,0,0.2)', borderRadius:8, padding:20, marginBottom:24}}>
                <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
                  <ShieldAlert size={24} color="var(--amber)"/>
                  <div style={{fontWeight:700, fontSize:16}}>Trial Period Active</div>
                </div>
                <p style={{fontSize:14, lineHeight:1.6, color:'var(--text-muted)'}}>
                  Your 7-day free trial is currently active. You have <strong>{licenseInfo?.trialRemaining} days</strong> remaining before the software locks.
                  Please activate your license to enjoy permanent access and technical support.
                </p>
              </div>
            ) : (
              <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr', marginBottom:24}}>
                <div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:4}}>License Status</div>
                  <div style={{fontWeight:700,color:'var(--green)',display:'flex',alignItems:'center',gap:6}}>
                    <CheckCircle size={16}/> Fully Activated
                  </div>
                </div>
                <div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:4}}>Licensed To</div>
                  <div style={{fontWeight:700}}>{licenseInfo?.payload?.client || 'N/A'}</div>
                </div>
                <div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:4}}>Expiry Date</div>
                  <div style={{fontWeight:700}}>
                    {licenseInfo?.payload?.isLifetime ? '♾️ Lifetime Access' : (licenseInfo?.payload?.expiry || 'N/A')}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:4}}>Hardware ID</div>
                  <div style={{fontWeight:700, fontSize:11, opacity:0.7}}>{licenseInfo?.hwid}</div>
                </div>
              </div>
            )}

            {!licenseInfo?.activated && (
              <div style={{borderTop:'1px solid var(--glass-border)', paddingTop:24}}>
                <div style={{fontWeight:600, marginBottom:12, fontSize:14}}>Activate Software</div>
                <div className="form-group">
                  <label className="form-label">Serial Key</label>
                  <div style={{display:'flex', gap:10}}>
                    <input 
                      className="form-input" 
                      placeholder="Paste your activation key here..." 
                      value={form.serial_key || ''} 
                      onChange={e => setForm({...form, serial_key: e.target.value})}
                    />
                    <button className="btn btn--primary" onClick={async () => {
                      if (!form.serial_key) return
                      const res = await window.api.activateLicense(form.serial_key)
                      if (res.success) {
                        toast2('Software activated successfully!')
                        setActivated(true)
                        window.location.reload()
                      } else {
                        toast2(res.message, 'error')
                      }
                    }}>Activate Now</button>
                  </div>
                  <p style={{fontSize:11, color:'var(--text-muted)', marginTop:8}}>
                    Your unique Hardware ID: <strong>{licenseInfo?.hwid}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{background:'var(--accent-dim)',border:'1px solid rgba(99,102,241,0.2)'}}>
            <p style={{fontSize:13,color:'var(--accent-light)',margin:0}}>
              🛡️ Your license is cryptographically signed and locked to this hardware. For renewal or transferring to a new machine, contact the administrator with your HWID.
            </p>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className={`toast toast--${toast.type}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div></div>}
    </div>
  )
}
