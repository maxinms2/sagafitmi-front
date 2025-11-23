import React from 'react'

type Props = {
  onNavigate?: (page: 'home' | 'login') => void
}

export default function NavBar({ onNavigate }: Props) {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
      <div className="container-fluid px-3 px-md-4">
        <div className="d-flex w-100 align-items-center justify-content-between">
          <a className="navbar-brand d-flex align-items-center gap-3 mb-0" href="#">
            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{width:44,height:44, background: 'linear-gradient(90deg,#06b6d4,#10b981)', color: 'white', fontWeight:700}}>SF</div>
            <span className="fw-semibold fs-5 mb-0">Sagafitmi</span>
          </a>

          <div className="d-flex align-items-center">
            <nav className="nav">
              <a
                className="nav-link text-secondary px-3"
                href="#login"
                onClick={e => {
                  e.preventDefault()
                  onNavigate?.('login')
                }}
              >
                Login
              </a>
            </nav>
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
