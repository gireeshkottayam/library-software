import React, { useState, useEffect, useRef } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff } from 'lucide-react'

export default function QRScanner({ onScan, active = true }) {
  const [hasCamera, setHasCamera] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [notified, setNotified] = useState(false)

  useEffect(() => {
    if (!active) return
    
    let stream = null
    let animationId = null

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setHasCamera(true)
          if (!notified) {
            // We can't use a toast here easily without a prop, so we'll just set state
            setNotified(true)
          }
        }
      } catch (err) {
        console.error("Webcam error:", err)
        setHasCamera(false)
      }
    }

    initCamera()

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [active])

  useEffect(() => {
    if (!hasCamera || !active) return

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current
        const video = videoRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        canvas.height = video.videoHeight
        canvas.width = video.videoWidth
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        })

        if (code) {
          onScan(code.data)
        }
      }
      requestAnimationFrame(tick)
    }

    const animationId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationId)
  }, [hasCamera, active, onScan])

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: hasCamera ? 'var(--green-dim)' : 'var(--red-dim)',
        borderRadius: 20,
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-md)',
        color: hasCamera ? 'var(--green)' : 'var(--red)',
        fontSize: 12,
        fontWeight: 600
      }}>
        {hasCamera ? <Camera size={14}/> : <CameraOff size={14}/>}
        {hasCamera === null ? 'Detecting Camera...' : hasCamera ? 'Webcam Active' : 'No Webcam Found'}
      </div>
      
      {/* Hidden processing elements */}
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
