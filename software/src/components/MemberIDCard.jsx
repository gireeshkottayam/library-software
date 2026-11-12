import React, { useRef, useEffect, useState } from 'react'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import { Download, X, Mail, Phone, MapPin, User } from 'lucide-react'
import logo from '../assets/logo.png'

// Enterprise Design Tokens
const ENT = {
  GREEN: '#138A52',
  BLUE: '#2E3192',
  ORANGE: '#F4A340',
  BG: '#F8F8F6',
  BG_WARM: '#F3F4F1',
  ACCENT_GRAY: '#D9DCE3',
  TEXT_NAVY: '#0F172A',
  TEXT_MUTED: '#64748B'
}

export default function MemberIDCard({ member, settings, onClose }) {
  const cardRef = useRef(null)
  const [qr, setQr] = useState('')
  const [downloading, setDownloading] = useState(false)

  const isPermanent = member?.member_type === 'Permanent'
  const membershipID = String(member?.reg_no || "0").padStart(4, '0')

  useEffect(() => {
    if (membershipID) {
      QRCode.toDataURL(membershipID, { 
        margin: 1, 
        width: 300, 
        color: { dark: ENT.BLUE, light: '#ffffff' } 
      }, (err, url) => {
        if (!err) setQr(url)
      })
    }
  }, [membershipID])

  async function downloadImage() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        pixelRatio: 5,
        backgroundColor: '#fff',
        width: 780,
        height: 480
      })
      const cleanName = (member.full_name || 'Member').trim().replace(/\s+/g, '_')
      const link = document.createElement('a')
      link.download = `${cleanName}_ID-${membershipID}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(false)
    }
  }

  if (!member) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 2000, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="modal" style={{ width: 'auto', background: 'transparent', boxShadow: 'none', padding: 0, maxWidth: 'none', maxHeight: 'none', overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button className="btn btn--secondary btn--icon" onClick={onClose} style={{ borderRadius: '50%', background: '#fff', border: `1px solid ${ENT.ACCENT_GRAY}`, color: '#333', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ width: '780px', height: '480px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.1)', background: '#fff' }}>
          <div ref={cardRef} style={{ width: '780px', height: '480px' }}>
            <EnterpriseSmartCard member={member} settings={settings} qr={qr} membershipID={membershipID} isPermanent={isPermanent} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 25, marginTop: 40, justifyContent: 'center' }}>
          <button className="btn" onClick={downloadImage} disabled={downloading} style={{ 
            padding: '18px 70px', fontSize: '18px', borderRadius: '15px', fontWeight: 900, 
            background: isPermanent ? ENT.ORANGE : ENT.GREEN, 
            border: 'none', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: 15, transition: 'all 0.3s ease'
          }}>
            <Download size={24} /> 
            {downloading ? 'Processing Asset...' : 'Download Official ID'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EnterpriseSmartCard({ member, settings, qr, membershipID, isPermanent }) {
  const primaryAccent = isPermanent ? ENT.ORANGE : ENT.GREEN;
  const cardBg = isPermanent ? ENT.BG_WARM : ENT.BG;

  const nameLength = member.full_name?.length || 0;
  const nameFontSize = nameLength > 20 ? (nameLength > 30 ? '20px' : '26px') : '32px';

  const libName = settings.library_name?.toUpperCase() || "";
  const libNameFontSize = libName.length > 35 ? '15px' : (libName.length > 25 ? '17px' : '19px');

  const regNoRaw = settings.library_reg_no || "1769/56";
  let formattedRegNo = regNoRaw;
  if (regNoRaw.includes('/')) {
    const parts = regNoRaw.split('/');
    formattedRegNo = `${parts[1]} / ${parts[0]}`;
  }

  return (
    <div style={{
      width: '780px', height: '480px',
      background: cardBg,
      position: 'relative',
      fontFamily: "'Inter', sans-serif",
      color: ENT.TEXT_NAVY,
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 20 Q 50 0, 100 20" fill="none" stroke={ENT.BLUE} strokeWidth="0.5" />
          <path d="M0 80 Q 50 100, 100 80" fill="none" stroke={ENT.GREEN} strokeWidth="0.5" />
        </svg>
      </div>

      {/* HEADER */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '75px', background: '#fff', borderBottom: `1px solid ${ENT.ACCENT_GRAY}`, padding: '0 35px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
         <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', display: 'flex' }}>
            <div style={{ flex: 1, background: ENT.GREEN }}></div>
            <div style={{ flex: 1, background: ENT.BLUE }}></div>
            <div style={{ flex: 1, background: ENT.ORANGE }}></div>
         </div>
         
         <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ 
              fontSize: libNameFontSize, fontWeight: 900, color: ENT.BLUE, 
              letterSpacing: '0.5px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
              lineHeight: '1.1', marginBottom: '2px'
            }}>
              {libName}
            </div>

            <div style={{ 
              fontSize: '8px', fontWeight: 700, color: ENT.TEXT_NAVY, 
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
              display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px'
            }}>
              <span>{settings.library_address}</span>
              <span style={{ color: ENT.ORANGE, fontSize: '10px' }}>•</span>
              <span>{settings.library_phone}</span>
              <span style={{ color: ENT.ORANGE, fontSize: '10px' }}>•</span>
              <span>{settings.library_email}</span>
            </div>

            <div style={{ fontSize: '9px', fontWeight: 800, color: ENT.TEXT_MUTED, letterSpacing: '2px', whiteSpace: 'nowrap', lineHeight: '1' }}>
              {isPermanent ? 'PERMANENT' : 'GENERAL'} IDENTITY CARD
            </div>
         </div>

         <div style={{ marginLeft: '20px', display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '12px', fontWeight: 900, color: ENT.TEXT_NAVY, lineHeight: '1', whiteSpace: 'nowrap' }}>REG NO: {formattedRegNo}</div>
               <div style={{ fontSize: '8px', fontWeight: 700, color: ENT.TEXT_MUTED, letterSpacing: '0.5px', marginTop: 5, whiteSpace: 'nowrap' }}>ESTABLISHED FOR KNOWLEDGE</div>
            </div>
            <div style={{ width: '45px', height: '45px', background: ENT.BG, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${ENT.ACCENT_GRAY}` }}>
               <img src={logo} style={{ width: '30px' }} />
            </div>
         </div>
      </div>

      {/* FOOTER */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '55px', background: '#fff', borderTop: `1px solid ${ENT.ACCENT_GRAY}`, display: 'flex', alignItems: 'center', padding: '0 35px', boxSizing: 'border-box' }}>
         <div style={{ width: '120px', height: '3px', background: primaryAccent, borderRadius: '2px' }}></div>
         <div style={{ flex: 1, textAlign: 'center', fontSize: '10px', fontWeight: 800, color: ENT.TEXT_MUTED, letterSpacing: '5px', whiteSpace: 'nowrap' }}>
            KNOWLEDGE • COMMUNITY • GROWTH
         </div>
         <div style={{ width: '120px', height: '3px', background: ENT.BLUE, borderRadius: '2px' }}></div>
      </div>

      {/* MAIN AREA */}
      <div style={{ position: 'absolute', top: '75px', left: 0, width: '100%', height: '350px', display: 'flex' }}>
         
         {/* LEFT PANEL */}
         <div style={{ width: '240px', padding: '25px 35px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
            <div style={{ 
              width: '170px', height: '210px', 
              borderRadius: '20px', padding: '6px', 
              background: '#fff', border: `1px solid ${ENT.ACCENT_GRAY}`,
              boxShadow: `0 15px 35px ${primaryAccent}15`
            }}>
               <div style={{ width: '100%', height: '100%', borderRadius: '14px', overflow: 'hidden', background: '#cbd5e1' }}>
                  {member.photo ? <img src={member.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={80} color="#fff" style={{ marginTop: 60, marginLeft: 45 }} />}
               </div>
            </div>

            {/* Premium Badge: Software Visual Identity matching */}
            <div style={{ 
              marginTop: '12px', background: primaryAccent, color: '#fff', 
              width: '180px', textAlign: 'center', padding: '10px 0', 
              borderRadius: '50px', fontSize: '11px', fontWeight: 900, 
              letterSpacing: '2px', lineHeight: '1', whiteSpace: 'nowrap',
              boxShadow: `0 8px 16px ${primaryAccent}44`,
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
               {isPermanent ? 'PERMANENT' : 'GENERAL'} MEMBER
            </div>

            <div style={{ 
              marginTop: '10px', fontSize: '15px', fontWeight: 900, color: ENT.TEXT_NAVY, 
              letterSpacing: '0px', lineHeight: '1.2', whiteSpace: 'nowrap', textAlign: 'center' 
            }}>
               REG. ID: {membershipID}
            </div>

            <div style={{
               marginTop: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
            }}>
               <div style={{ fontSize: '7.5px', fontWeight: 800, color: ENT.TEXT_MUTED, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>JOINING DATE & TIME</div>
               <div style={{ fontSize: '10px', fontWeight: 900, color: ENT.TEXT_NAVY, whiteSpace: 'nowrap' }}>
                 {member.created_at ? new Date(member.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
                   day: '2-digit', month: '2-digit', year: 'numeric',
                   hour: '2-digit', minute: '2-digit', hour12: true
                 }).toUpperCase() : '—'}
               </div>
            </div>
         </div>

         {/* CENTER PANEL */}
         <div style={{ width: '320px', padding: '25px 15px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: '15px' }}>
               <div style={{ 
                 fontSize: nameFontSize, fontWeight: 900, color: ENT.TEXT_NAVY, 
                 lineHeight: '1.1', whiteSpace: 'normal', maxWidth: '290px',
                 wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
               }}>
                 {member.full_name?.toUpperCase()}
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
               <InfoField label="DATE OF BIRTH" value={member.dob} />
               <InfoField label="GENDER" value={member.gender} />
               <InfoField label="BLOOD GROUP" value={member.blood_group} />
               <InfoField label="PHONE NUMBER" value={member.phone} />
               <div style={{ gridColumn: 'span 2' }}>
                  <InfoField label="REGISTERED EMAIL ADDRESS" value={member.email || 'N/A'} lowercase />
               </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: `1px solid ${ENT.ACCENT_GRAY}`, paddingBottom: '10px' }}>
               <div style={{ fontSize: '8px', fontWeight: 900, color: ENT.TEXT_MUTED, letterSpacing: '1px', marginBottom: 8, whiteSpace: 'nowrap' }}>MEMBER INSTRUCTIONS</div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <InstructionRow text="1. Present this card for all library transactions." />
                  <InstructionRow text="2. Member is responsible for books borrowed on this card." />
                  <InstructionRow text="3. Loss of card must be reported to the library immediately." />
                  <InstructionRow text="4. Handle all library materials with utmost care." />
               </div>
            </div>
         </div>

         {/* RIGHT PANEL */}
          <div style={{ width: '220px', height: '100%', background: '#fff', position: 'relative', boxSizing: 'border-box' }}>
            {/* Centered QR Section */}
            <div style={{ 
              height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <div style={{ 
                width: '175px', height: '175px', borderRadius: '24px', border: `1px solid ${ENT.ACCENT_GRAY}`, 
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' 
              }}>
                 {qr && <img src={qr} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
              </div>
            </div>

            {/* Contact Info moved to Header */}

            {/* SIGNATURE SECTION: Fixed geometry to prevent overlap, pinned lower */}
            <div style={{ 
              position: 'absolute', bottom: '15px', left: '20px', right: '20px',
              height: '85px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' 
            }}>
               <div style={{ fontSize: '7px', fontWeight: 900, color: ENT.TEXT_MUTED, letterSpacing: '1px', whiteSpace: 'nowrap', marginBottom: 2 }}>AUTHORIZED SIGNATORY</div>
               <div style={{ width: '110px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', overflow: 'hidden' }}>
                  {settings.library_signature ? (
                    <img 
                      src={settings.library_signature} 
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block', border: 'none', outline: 'none', padding: 0 }} 
                    />
                  ) : (
                    <div style={{ width: '100%', borderBottom: `1px dashed ${ENT.ACCENT_GRAY}` }}></div>
                  )}
               </div>
               <div style={{ fontSize: '9px', fontWeight: 900, color: ENT.BLUE, marginTop: 4, whiteSpace: 'nowrap' }}>SECRETARY</div>
            </div>
         </div>
      </div>
    </div>
  )
}

function InfoField({ label, value, lowercase }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
       <div style={{ fontSize: '8.5px', fontWeight: 800, color: ENT.TEXT_MUTED, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{label}</div>
       <div style={{ 
         fontSize: '13.5px', fontWeight: 900, color: ENT.TEXT_NAVY,
         textTransform: lowercase ? 'lowercase' : 'uppercase',
         lineHeight: '1.1',
         whiteSpace: 'nowrap'
       }}>
         {value || '—'}
       </div>
    </div>
  )
}

function ContactItem({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: '1' }}>
       <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</div>
       <div style={{ fontSize: '7.5px', fontWeight: 700, color: ENT.TEXT_MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</div>
    </div>
  )
}

function InstructionRow({ text }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
       <div style={{ fontSize: '7.2px', fontWeight: 600, color: ENT.TEXT_MUTED, lineHeight: '1.2', whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  )
}
