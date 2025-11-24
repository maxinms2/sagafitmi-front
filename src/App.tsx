import './App.css'
import { useState } from 'react'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import { getUser as getStoredUser, setUser as setStoredUser, clearUser as clearStoredUser, clearToken as clearStoredToken } from './services/storage'

type Page = 'home' | 'login' | 'register'

function App() {
  const [page, setPage] = useState<Page>('home')
  const [user, setUser] = useState<string | null>(getStoredUser())

  const handleNavigate = (p: Page) => setPage(p)

  const handleLogin = (userEmail: string) => {
    // actualizar storage y estado local para que NavBar se actualice inmediatamente
    try {
      setStoredUser(userEmail)
    } catch (e) {
      console.warn('No se pudo persistir usuario tras login', e)
    }
    setUser(userEmail)
    setPage('home')
  }

  const handleLogout = () => {
    try {
      clearStoredToken()
      clearStoredUser()
    } catch (e) {
      console.warn('Error al limpiar sesión', e)
    }
    setUser(null)
    setPage('home')
  }

  return (
    <>
      <NavBar onNavigate={handleNavigate} user={user} onLogout={handleLogout} />
      {page === 'home' && <Home />}
      {page === 'login' && <Login onBack={() => setPage('home')} onLogin={handleLogin} />}
      {page === 'register' && <Register onBack={() => setPage('home')} onCreated={() => setPage('login')} />}
    </>
  )
}

export default App
