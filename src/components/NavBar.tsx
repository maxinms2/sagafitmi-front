type Props = {
  onNavigate?: (page: 'home' | 'login' | 'register') => void
  user?: string | null
  onLogout?: () => void
}

export default function NavBar({ onNavigate, user, onLogout }: Props) {
  const handleLogout = () => {
    try {
      onLogout?.()
    } catch (e) {
      console.warn('Error during logout', e)
    }
    onNavigate?.('home')
  }
  
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
      <div className="container-fluid px-3 px-md-4">
        <div className="d-flex w-100 align-items-center justify-content-between">
          <a className="navbar-brand d-flex align-items-center gap-3 mb-0" href="#">
            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{width:44,height:44, background: 'linear-gradient(90deg,#06b6d4,#10b981)', color: 'white', fontWeight:700}}>SF</div>
            <span className="fw-semibold fs-5 mb-0">Sagafitmi</span>
          </a>

          <div className="d-flex align-items-center position-relative">
            <nav className="nav">
              {user ? (
                <>
                  <span className="nav-link text-secondary px-3">{user}</span>
                  <button className="btn btn-link text-danger px-3" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <a
                    className="nav-link text-secondary px-3"
                    href="#login"
                    onClick={e => {
                      e.preventDefault()
                      onNavigate?.('login')
                    }}
                  >
                    Iniciar Sesión
                  </a>
                  <button className="btn btn-link text-primary px-3" onClick={e => { e.preventDefault(); onNavigate?.('register') }}>
                    Crear cuenta
                  </button>
                </>
              )}
            </nav>
            {/* now navigation handles opening the register page */}
            <div className="vr mx-2" aria-hidden="true" style={{height: '28px'}}></div>
            <nav className="nav">
              <a className="nav-link text-primary px-3 fw-medium" href="#acercade">Acerca de</a>
            </nav>
          </div>
        </div>
      </div>
    </nav>
  )
}
