import './App.css'
import { useState } from 'react'
import NavBar from './components/NavBar'
import { isAdmin as tokenIsAdmin } from './services/jwt'
import Home from './pages/Home'
import AdminProducts from './pages/AdminProducts'
import AdminUsers from './pages/AdminUsers'
import AdminOrders from './pages/AdminOrders'
import SalesMetrics from './pages/SalesMetrics'
import ProductsMetrics from './pages/ProductsMetrics'
import Login from './pages/Login'
import Register from './pages/Register'
import { getUser as getStoredUser, setUser as setStoredUser, clearUser as clearStoredUser, clearToken as clearStoredToken } from './services/storage'

type Page = 'home' | 'login' | 'register' | 'products' | 'orders' | 'metrics' | 'metricsProducts' | 'users'

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

  const isAdmin = tokenIsAdmin()

  return (
    <>
      <NavBar onNavigate={handleNavigate} user={user} onLogout={handleLogout} isAdmin={isAdmin} />
      {page === 'home' && <Home />}
      {page === 'products' && <AdminProducts onBack={() => setPage('home')} />}
      {page === 'users' && <AdminUsers onBack={() => setPage('home')} />}
      {page === 'orders' && <AdminOrders onBack={() => setPage('home')} />}
          {page === 'metrics' && <SalesMetrics onBack={() => setPage('home')} />}
          {page === 'metricsProducts' && <ProductsMetrics onBack={() => setPage('home')} />}
      {page === 'login' && <Login onBack={() => setPage('home')} onLogin={handleLogin} />}
      {page === 'register' && <Register onBack={() => setPage('home')} onCreated={() => setPage('login')} />}
    </>
  )
}

export default App
