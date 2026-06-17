import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { AVATAR_COLORS, authApi } from '../../api/auth.api'
import { mediaApi } from '../../api/media.api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Avatar } from '../chat/Avatar'
import { ImageCropModal } from './ImageCropModal'
import './ProfileSettings.css'

export function ProfileSettings() {
  const { user, setUser } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? AVATAR_COLORS[0])
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')

  const [username, setUsername] = useState(user?.username ?? '')
  const [usernamePassword, setUsernamePassword] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  if (!user) return null

  const previewUser = {
    displayName: displayName || user.displayName,
    avatarColor,
    avatarUrl: avatarUrl || undefined,
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const { user: updated } = await authApi.updateProfile({
        displayName: displayName.trim(),
        avatarColor,
        avatarUrl: avatarUrl || null,
      })
      setUser(updated)
      setSuccess('Profile updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUsernameSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const { user: updated } = await authApi.updateUsername(username.trim(), usernamePassword)
      setUser(updated)
      setUsernamePassword('')
      setSuccess('Username updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const { user: updated } = await authApi.updatePassword(currentPassword, newPassword)
      setUser(updated)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Password updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setCropImageSrc(URL.createObjectURL(file))
  }

  function closeCropModal() {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
  }

  async function handleCroppedUpload(file: File) {
    setUploadingPhoto(true)
    setError('')
    try {
      const { url } = await mediaApi.uploadImage(file)
      setAvatarUrl(url)
      const { user: updated } = await authApi.updateProfile({ avatarUrl: url })
      setUser(updated)
      setSuccess('Profile photo updated.')
      closeCropModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleRemovePhoto() {
    setAvatarUrl('')
    setError('')
    try {
      const { user: updated } = await authApi.updateProfile({ avatarUrl: null })
      setUser(updated)
      setSuccess('Profile photo removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove photo')
    }
  }

  return (
    <div className="profile-settings">
      <div className="profile-settings__hero">
        <Avatar user={previewUser} size="lg" />
        <div>
          <h3>{previewUser.displayName}</h3>
          <p>@{user.username}</p>
        </div>
      </div>

      <div className="settings-toggle-row">
        <div className="settings-toggle-row__text">
          <span className="settings-toggle-row__label">Dark mode</span>
          <p className="settings-modal__desc settings-modal__desc--inline">
            Switch between light and dark background.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
          className={`settings-switch ${isDark ? 'settings-switch--on' : ''}`}
          onClick={toggleTheme}
        >
          <span className="settings-switch__thumb" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="profile-settings__file"
        onChange={handlePhotoPick}
        aria-hidden
        tabIndex={-1}
      />

      <div className="profile-settings__photo-actions">
        <button
          type="button"
          className="profile-settings__secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? 'Uploading...' : 'Upload & crop photo'}
        </button>
        {avatarUrl && (
          <button type="button" className="profile-settings__link" onClick={handleRemovePhoto}>
            Remove photo
          </button>
        )}
      </div>

      <form onSubmit={handleProfileSubmit} className="profile-settings__section">
        <h4>Profile</h4>
        <div className="settings-field">
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="settings-field">
          <span className="settings-field__label">Avatar color</span>
          <div className="profile-settings__colors">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`profile-settings__color ${avatarColor === color ? 'profile-settings__color--active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setAvatarColor(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        <button type="submit" className="settings-save" disabled={submitting}>
          Save profile
        </button>
      </form>

      <form onSubmit={handleUsernameSubmit} className="profile-settings__section">
        <h4>Username</h4>
        <div className="settings-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="settings-field">
          <label htmlFor="usernamePassword">Current password</label>
          <input
            id="usernamePassword"
            type="password"
            value={usernamePassword}
            onChange={(e) => setUsernamePassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="settings-save" disabled={submitting}>
          Update username
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="profile-settings__section">
        <h4>Password</h4>
        <div className="settings-field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div className="settings-field">
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <div className="settings-field">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <button type="submit" className="settings-save" disabled={submitting}>
          Update password
        </button>
      </form>

      {error && <p className="settings-error">{error}</p>}
      {success && <p className="settings-success">{success}</p>}

      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          onCancel={closeCropModal}
          onConfirm={handleCroppedUpload}
        />
      )}
    </div>
  )
}
