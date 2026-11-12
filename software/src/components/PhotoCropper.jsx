import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { X, Check } from 'lucide-react'

export default function PhotoCropper({ image, onCropComplete, onCancel, aspect = 155 / 190, title = "Crop Photo" }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropChange = useCallback((crop) => {
    setCrop(crop)
  }, [])

  const onZoomChange = useCallback((zoom) => {
    setZoom(zoom)
  }, [])

  const onCropAreaChange = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleDone = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels)
      onCropComplete(croppedImage)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal" style={{ width: '500px', height: '600px', display: 'flex', flexDirection: 'column' }}>
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="modal__close" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal__body" style={{ flex: 1, position: 'relative', background: '#333' }}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaChange}
            onZoomChange={onZoomChange}
          />
        </div>
        <div className="modal__footer" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ width: '100%' }}>
            <label className="form-label">Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
            <button className="btn btn--primary" onClick={handleDone}>
              <Check size={16} /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve) => (image.onload = resolve))

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return canvas.toDataURL('image/png')
}
