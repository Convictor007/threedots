import './ConfirmModal.css'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  loadingLabel?: string
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading,
  loadingLabel = 'Working...',
}: ConfirmModalProps) {
  return (
    <div className="confirm-modal" onClick={onCancel} role="presentation">
      <div
        className="confirm-modal__content"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        <h2 id="confirm-modal-title" className="confirm-modal__title">
          {title}
        </h2>
        <p id="confirm-modal-message" className="confirm-modal__message">
          {message}
        </p>
        <div className="confirm-modal__actions">
          <button type="button" className="confirm-modal__cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-modal__confirm" onClick={onConfirm} disabled={loading}>
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
