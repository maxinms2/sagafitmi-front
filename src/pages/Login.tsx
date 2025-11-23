import React, { useState } from 'react'
import { login as loginRequest } from '../services/auth'
import { setToken } from '../services/storage'

type Props = { onBack?: () => void }

export default function Login({ onBack }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await loginRequest({ email, password })
      if (res.token) {
        setToken(res.token)
        console.log('Login successful, token saved')
        if (onBack) onBack()
        else alert('Login correcto')
      } else {
        throw new Error('Respuesta inválida: no se recibió token')
      }
    } catch (err: any) {
      console.error('Login error', err)
      setError(err?.message || 'Error durante el login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ paddingTop: '2rem' }}>
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">Iniciar sesión</h5>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                    {onBack && (
                      <button type="button" className="btn btn-link" onClick={onBack} disabled={loading}>
                        Volver
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
