import React, { useRef, useEffect, useState } from 'react'
import jsQR from 'jsqr'
import { X, Camera, ShieldAlert } from 'lucide-react'

export default function Scanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    let stream = null
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          requestAnimationFrame(tick)
        }
      } catch (err) {
        setError("Camera access denied or not found.")
        console.error(err)
      }
    }

    startCamera()
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
      setScanning(false)
    }
  }, [])

  const tick = () => {
    if (!scanning) return
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      canvas.height = video.videoHeight
      canvas.width = video.videoWidth
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (code) {
        onScan(code.data)
        setScanning(false)
      } else {
        requestAnimationFrame(tick)
      }
    } else {
      requestAnimationFrame(tick)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal" style={{ width: '500px', padding: 0, overflow: 'hidden' }}>
        <div className="modal__header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <div className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={18} color="var(--accent)" />
            Scan Member ID Card
          </div>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div style={{ position: 'relative', width: '100%', height: '400px', background: '#000' }}>
          {error ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: '#fff' }}>
              <ShieldAlert size={48} color="var(--red)" style={{ marginBottom: 15 }} />
              <div style={{ fontWeight: 600 }}>{error}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>Please ensure your camera is connected and you have granted permission.</div>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {/* Scanning Guide Overlay */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)'
              }}>
                <div style={{
                  width: '240px', height: '240px',
                  border: '2px solid var(--accent)',
                  borderRadius: '12px',
                  boxShadow: '0 0 0 1000px rgba(0,0,0,0.5)',
                  position: 'relative'
                }}>
                  {/* Corner Accents */}
                  <div style={{ position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTop: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '4px 0 0 0' }} />
                  <div style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTop: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 4px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottom: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '0 0 0 4px' }} />
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottom: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 0 4px 0' }} />
                  
                  {/* Animated Scan Line */}
                  <div className="scan-line" />
                </div>
              </div>
              
              <div style={{ position: 'absolute', bottom: 20, width: '100%', textAlign: 'center', color: '#fff', fontSize: 13, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Center the QR code in the square to scan
              </div>
            </>
          )}
        </div>
        
        <div className="modal__footer" style={{ justifyContent: 'center', padding: '15px' }}>
          <button className="btn btn--secondary" onClick={onClose}>Cancel Scanning</button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent);
          top: 0;
          animation: scan 2s linear infinite;
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}} />
    </div>
  )
}
