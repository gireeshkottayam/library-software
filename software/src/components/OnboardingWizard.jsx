import React, { useState } from 'react'
import { Save, ChevronRight, ChevronLeft, CheckCircle2, ShieldCheck, Settings, Wallet } from 'lucide-react'

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    library_name: '',
    library_address: '',
    library_phone: '',
    library_reg_no: '',
    library_reg_year: '',
    max_books_general: 2,
    max_books_permanent: 5,
    borrow_duration: 14,
    fine_per_day: 2,
    fee_general: 100,
    fee_permanent: 500,
    reserved_reg_count: 300
  })

  const hc = e => setForm({ ...form, [e.target.name]: e.target.value })

  async function handleFinish() {
    try {
      await window.api.saveSettings(form)
      onComplete()
    } catch (err) {
      alert('Error saving settings: ' + err.message)
    }
  }

  const steps = [
    { title: 'Library Info', icon: <Settings size={20}/> },
    { title: 'Rules', icon: <ShieldCheck size={20}/> },
    { title: 'Fees', icon: <Wallet size={20}/> }
  ]

  return (
    <div className="modal-overlay" style={{background: 'var(--bg-primary)', zIndex: 9999}}>
      <div className="modal modal--wide" style={{maxWidth: 600}}>
        <div className="modal__header">
          <div className="modal__title">🚀 Welcome to Kooroppada Library</div>
        </div>
        
        <div style={{padding: '20px 30px'}}>
          {/* Progress Bar */}
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:30, position:'relative'}}>
            <div style={{position:'absolute', top:15, left:0, right:0, height:2, background:'var(--glass-border)', zIndex:0}} />
            <div style={{position:'absolute', top:15, left:0, width: `${(step-1)*50}%`, height:2, background:'var(--accent)', transition:'0.3s', zIndex:0}} />
            
            {steps.map((s,i) => (
              <div key={i} style={{zIndex:1, textAlign:'center'}}>
                <div style={{
                  width:32, height:32, borderRadius:'50%', 
                  background: step > i+1 ? 'var(--accent)' : step === i+1 ? 'var(--bg-primary)' : 'var(--bg-primary)',
                  border: `2px solid ${step >= i+1 ? 'var(--accent)' : 'var(--glass-border)'}`,
                  color: step > i+1 ? '#fff' : step === i+1 ? 'var(--accent)' : 'var(--text-muted)',
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px',
                  transition:'0.3s'
                }}>
                  {step > i+1 ? <CheckCircle2 size={18}/> : s.icon}
                </div>
                <div style={{fontSize:11, fontWeight:600, color: step >= i+1 ? 'var(--text-primary)' : 'var(--text-muted)'}}>{s.title}</div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="form-grid">
              <div className="form-group form-full"><label className="form-label">Library Name (English) *</label><input className="form-input" name="library_name" value={form.library_name} onChange={hc} placeholder="e.g. Public Library Kooroppada"/></div>
              <div className="form-group form-full"><label className="form-label">Address</label><input className="form-input" name="library_address" value={form.library_address} onChange={hc} placeholder="Full address..."/></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" name="library_phone" value={form.library_phone} onChange={hc} placeholder="+91 ..."/></div>
              <div className="form-group"><label className="form-label">Reg. No.</label><input className="form-input" name="library_reg_no" value={form.library_reg_no} onChange={hc} placeholder="e.g. 123"/></div>
              <div className="form-group"><label className="form-label">Reg. Year</label><input className="form-input" name="library_reg_year" value={form.library_reg_year} onChange={hc} placeholder="e.g. 1980"/></div>
              <div className="form-group"><label className="form-label">Reserved ID Count</label><input className="form-input" type="number" name="reserved_reg_count" value={form.reserved_reg_count} onChange={hc}/></div>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Borrow Duration (Days)</label><input className="form-input" type="number" name="borrow_duration" value={form.borrow_duration} onChange={hc}/></div>
              <div className="form-group"><label className="form-label">Fine Per Day (₹)</label><input className="form-input" type="number" name="fine_per_day" value={form.fine_per_day} onChange={hc}/></div>
              <div className="form-group"><label className="form-label">Max Books (General)</label><input className="form-input" type="number" name="max_books_general" value={form.max_books_general} onChange={hc}/></div>
              <div className="form-group"><label className="form-label">Max Books (Permanent)</label><input className="form-input" type="number" name="max_books_permanent" value={form.max_books_permanent} onChange={hc}/></div>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Registration Fee - General (₹)</label><input className="form-input" type="number" name="fee_general" value={form.fee_general} onChange={hc}/></div>
              <div className="form-group"><label className="form-label">Registration Fee - Permanent (₹)</label><input className="form-input" type="number" name="fee_permanent" value={form.fee_permanent} onChange={hc}/></div>
              <div style={{gridColumn:'span 2', padding:20, background:'var(--accent-dim)', borderRadius:12, marginTop:10, textAlign:'center'}}>
                <div style={{fontSize:18, fontWeight:700, color:'var(--accent)', marginBottom:8}}>All Set!</div>
                <div style={{fontSize:13, color:'var(--text-primary)'}}>You can change these settings anytime from the Settings menu.</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal__footer" style={{padding: '20px 30px'}}>
          {step > 1 && <button className="btn btn--ghost" onClick={() => setStep(step - 1)}><ChevronLeft size={18}/> Back</button>}
          <div style={{marginLeft: 'auto'}}>
            {step < 3 ? (
              <button className="btn btn--primary" onClick={() => setStep(step + 1)} disabled={step===1 && !form.library_name}>
                Next Step <ChevronRight size={18}/>
              </button>
            ) : (
              <button className="btn btn--primary" onClick={handleFinish}>
                <Save size={18}/> Finish Setup & Start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
