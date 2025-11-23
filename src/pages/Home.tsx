import React from 'react'

export default function Home() {
  return (
    <div className="bg-light" style={{minHeight: '100vh'}}>
      <main className="container-fluid" style={{minHeight: 'calc(100vh - 80px)', paddingTop: '2rem'}}>
        <div className="d-flex align-items-center justify-content-center" style={{minHeight: '100%'}}>
          <div className="text-center text-muted">
            <p className="visually-hidden">Página principal — contenido pendiente</p>
            <div className="small">(Pantalla principal vacía — usa los enlaces 'Login' y 'Acerca de')</div>
          </div>
        </div>
      </main>
    </div>
  )
}
