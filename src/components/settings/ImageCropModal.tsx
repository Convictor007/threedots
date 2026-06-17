import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { getCroppedImageBlob } from '../../lib/cropImage'
import './ImageCropModal.css'

interface ImageCropModalProps {
  imageSrc: string
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function ImageCropModal({ imageSrc, onCancel, onConfirm }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedArea) return
    setSaving(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea)
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      onConfirm(file)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="image-crop-modal" onClick={onCancel} role="presentation">
      <div className="image-crop-modal__content" onClick={(e) => e.stopPropagation()}>
        <header className="image-crop-modal__header">
          <h2>Crop profile photo</h2>
          <button type="button" className="image-crop-modal__close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </header>

        <div className="image-crop-modal__cropper">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="image-crop-modal__zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        <div className="image-crop-modal__actions">
          <button type="button" className="image-crop-modal__cancel" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="image-crop-modal__confirm" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving...' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  )
}
