import React, { useState } from 'react'
import { createUser } from '../services/api'
import { notifySuccess } from '../utils/notify'

type Props = { onClose?: () => void; onCreated?: (email: string) => void }

export default function CreateUser({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name || !email || !password) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await createUser({ name, email, password })
      if (onCreated) onCreated(email)
      else notifySuccess('Usuario creado correctamente')
      onClose?.()
    } catch (err: any) {
      // El backend devuelve errores con formato: { message: "..." }
      // En `api.post` esos errores se lanzan como `Error("409 Usuario existente...")`.
      // Aquí extraemos el texto después del código de estado para mostrar sólo el mensaje.
      const raw = err?.message || String(err)
      const parsed = raw.replace(/^\d+\s*/, '')
      // Mostrar el mensaje que venga del backend (campo `message`) o el texto crudo.
      setError(parsed || raw)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card shadow-sm p-3" style={{ width: 360 }}>
      <form onSubmit={handleSubmit}>
        <h6 className="mb-2">Crear cuenta</h6>
        <div className="mb-2">
          <label className="form-label small">Nombre</label>
          <input className="form-control form-control-sm" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
        </div>
        <div className="mb-2">
          <label className="form-label small">Email</label>
          <input type="email" className="form-control form-control-sm" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
        </div>

        <div className="mb-2">
          <label className="form-label small">Password</label>
          <input type="password" className="form-control form-control-sm" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
        </div>

        <div className="mb-2">
          <label className="form-label small">Confirmar contraseña</label>
          <input type="password" className="form-control form-control-sm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} />
        </div>

        {error && (
          <div className="alert alert-danger py-1 small" role="alert">
            {error}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  )
}
