import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PinLockProvider } from './context/PinLockContext'
import { PresenceProvider } from './context/PresenceContext'
import { ThemeProvider } from './context/ThemeContext'
import { LoginPage } from './pages/LoginPage'
import { ChatPage } from './pages/ChatPage'
import { AdminPage } from './pages/AdminPage'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import './App.css'

type AppView = 'chat' | 'admin'

function AuthenticatedApp() {
  const { user } = useAuth()
  const [view, setView] = useState<AppView>('chat')

  if (user?.role === 'admin' && view === 'admin') {
    return <AdminPage onBack={() => setView('chat')} />
  }

  return (
    <ChatPage
      onOpenAdmin={user?.role === 'admin' ? () => setView('admin') : undefined}
    />
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-loading">
        <LoadingSpinner size="lg" label="Loading your wellness dashboard…" />
      </div>
    )
  }

  return (
    <PinLockProvider active={!!user}>
      {user ? (
        <PresenceProvider>
          <AuthenticatedApp />
        </PresenceProvider>
      ) : (
        <LoginPage />
      )}
    </PinLockProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
