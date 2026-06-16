import { AuthProvider, useAuth } from './context/AuthContext'
import { PinLockProvider } from './context/PinLockContext'
import { LoginPage } from './pages/LoginPage'
import { ChatPage } from './pages/ChatPage'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <p>Loading your wellness dashboard…</p>
      </div>
    )
  }

  return (
    <PinLockProvider active={!!user}>
      {user ? <ChatPage /> : <LoginPage />}
    </PinLockProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
