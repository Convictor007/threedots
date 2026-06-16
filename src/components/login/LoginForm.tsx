import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/client'
import { BRAND } from '../../constants/brand'
import { WellnessLogo } from '../brand/WellnessLogo'
import './LoginForm.css'

export function LoginForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(username, displayName, password)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <WellnessLogo size="lg" />
        <h2>{BRAND.name}</h2>
        <p className="login-hero__tagline">{BRAND.tagline}</p>
        <ul className="login-hero__features">
          <li>Daily mindfulness exercises</li>
          <li>Personalized nutrition insights</li>
          <li>Licensed wellness counselors</li>
          <li>Secure health journal</li>
        </ul>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <WellnessLogo size="md" />
          <h1>{BRAND.loginTitle}</h1>
          <p>{BRAND.loginSubtitle}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="displayName">Full name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="username">Member ID</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your.member.id"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
                ? 'Access Dashboard'
                : 'Join Program'}
          </button>
        </form>

        <div className="login-footer">
          {mode === 'login' ? (
            <p>
              New to {BRAND.name}?{' '}
              <button type="button" onClick={() => setMode('register')}>
                Create account
              </button>
            </p>
          ) : (
            <p>
              Already a member?{' '}
              <button type="button" onClick={() => setMode('login')}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
