import './App.css'
import { useState, useEffect } from 'react'
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

  // Escuchar desconexiones del servidor: cerrar sesión, limpiar token y notificar al usuario
  useEffect(() => {
    function onServerDisconnected(e: any) {
      try {
        handleLogout()
      } catch (err) {
        console.warn('Error handling server-disconnected', err)
      }
      // Mostrar modal para que el usuario confirme ir a login
      const msg = e?.detail?.message || 'Se perdió la conexión con el servidor.'
      setServerDisconnectedMessage(msg)
      setShowServerDisconnectedModal(true)
    }

    function onAuthRequired(e: any) {
      try {
        handleLogout()
      } catch (err) {
        console.warn('Error handling auth-required', err)
      }
      const msg = e?.detail?.message || 'Su sesión no es válida. Por favor inicie sesión de nuevo.'
      setServerDisconnectedMessage(msg)
      setModalTitle('Sesión finalizada')
      setShowServerDisconnectedModal(true)
    }

    window.addEventListener('server-disconnected', onServerDisconnected as EventListener)
    window.addEventListener('auth-required', onAuthRequired as EventListener)
    return () => {
      window.removeEventListener('server-disconnected', onServerDisconnected as EventListener)
      window.removeEventListener('auth-required', onAuthRequired as EventListener)
    }
  }, [])

  const [showServerDisconnectedModal, setShowServerDisconnectedModal] = useState(false)
  const [serverDisconnectedMessage, setServerDisconnectedMessage] = useState<string | null>(null)
  const [modalTitle, setModalTitle] = useState<string>('Conexión perdida')

  const handleGoToLogin = () => {
    setShowServerDisconnectedModal(false)
    setModalTitle('Conexión perdida')
    setPage('login')
  }

  const isAdmin = tokenIsAdmin()

  return (
    <>
      <NavBar onNavigate={handleNavigate} user={user} onLogout={handleLogout} isAdmin={isAdmin} />
      {/* Modal global para desconexión del servidor */}
      {showServerDisconnectedModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalTitle}</h5>
              </div>
              <div className="modal-body">
                <p>{serverDisconnectedMessage || 'No fue posible conectar con el servidor.'}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleGoToLogin}>
                  Ir al inicio de sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
