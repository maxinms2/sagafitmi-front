import { useEffect, useState, useRef } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../services/api'
import type { UserResponse } from '../services/api'

type Props = { onBack?: () => void }

export default function AdminUsers({ onBack }: Props) {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState<{ name: string; email: string; password: string; confirmPassword: string; role: 'USER' | 'ADMIN' }>({ name: '', email: '', password: '', confirmPassword: '', role: 'USER' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<{ name?: string; role?: 'USER' | 'ADMIN' }>({})
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserResponse | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL')

  const isMounted = useRef(true)

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const resp = await getUsers()
      if (!isMounted.current) return
      setUsers(resp || [])
    } catch (e: any) {
      if (!isMounted.current) return
      setError(e?.message || 'Error al obtener usuarios')
      setUsers([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchUsers()
    return () => { isMounted.current = false }
  }, [])

  function isValidEmail(email: string) {
    // simple but practical email regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ paddingTop: '2rem' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h4 mb-0">Administrar usuarios</h1>
            <div className="text-muted small">Listado administrativo — Usuarios</div>
          </div>
          <div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-success" onClick={() => setShowCreateDialog(true)}>Nuevo usuario</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>Volver</button>
              </div>
          </div>
        </div>

        {/* filtros */}
        <form className="row g-2 align-items-center mb-3" onSubmit={e => { e.preventDefault() }}>
          <div className="col-auto">
            <input className="form-control form-control-sm" placeholder="Filtrar por nombre" value={nameFilter} onChange={e => setNameFilter(e.target.value)} />
          </div>
          <div className="col-auto">
            <input className="form-control form-control-sm" placeholder="Filtrar por email" value={emailFilter} onChange={e => setEmailFilter(e.target.value)} />
          </div>
          <div className="col-auto">
            <select className="form-select form-select-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}>
              <option value="ALL">Todos los roles</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="col-auto">
            <button className="btn btn-sm btn-primary" type="submit">Aplicar</button>
          </div>
          <div className="col-auto">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setNameFilter(''); setEmailFilter(''); setRoleFilter('ALL') }}>Limpiar</button>
          </div>
        </form>

        {loading && (
          <div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div></div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">{error}</div>
        )}

        {!loading && !error && (
          <div className="table-responsive">
            <table className="table table-sm table-hover table-striped align-middle">
              <thead>
                <tr>
                  <th style={{width: '6%'}}>ID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th style={{width: '12%'}}>Rol</th>
                  <th style={{width: '14%'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u => {
                    if (nameFilter && !u.name.toLowerCase().startsWith(nameFilter.toLowerCase())) return false
                    if (emailFilter && !u.email.toLowerCase().startsWith(emailFilter.toLowerCase())) return false
                    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
                    return true
                  })
                  .map(u => (
                  <tr key={u.id}>
                    <td className="text-muted">{u.id}</td>
                    <td style={{minWidth: 200}}>
                      {editingId === u.id ? (
                        <input className="form-control form-control-sm" value={editValues.name ?? ''} onChange={e => setEditValues(ev => ({ ...ev, name: e.target.value }))} />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {editingId === u.id ? (
                        <select className="form-select form-select-sm" value={editValues.role ?? u.role as 'USER' | 'ADMIN'} onChange={e => setEditValues(ev => ({ ...ev, role: e.target.value as 'USER' | 'ADMIN' }))}>
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td>
                      {editingId === u.id ? (
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-primary" disabled={saving} onClick={async () => {
                            // Guardar cambios (solo name y role)
                            setSaving(true)
                            try {
                              const payload: any = {}
                              if (editValues.name !== undefined) payload.name = (editValues.name ?? '').trim()
                              if (editValues.role !== undefined) payload.role = editValues.role
                              const updated = await updateUser(u.id, payload)
                              if (updated == null) {
                                window.alert('No se pudo actualizar: usuario no existe o error')
                              } else {
                                setUsers(prev => prev.map(x => x.id === u.id ? { ...x, name: updated.name, role: updated.role } : x))
                                setEditingId(null)
                                setEditValues({})
                              }
                            } catch (err: any) {
                              window.alert(err?.message || 'Error actualizando usuario')
                            } finally {
                              setSaving(false)
                            }
                          }}>Guardar</button>
                          <button className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={() => { setEditingId(null); setEditValues({}) }}>Cancelar</button>
                        </div>
                      ) : (
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditingId(u.id); setEditValues({ name: u.name, role: u.role as 'USER' | 'ADMIN' }) }} title="Editar" aria-label="Editar">Editar</button>
                            <button className="btn btn-sm btn-outline-danger" title="Borrar" onClick={() => { setUserToDelete(u); setShowDeleteDialog(true) }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                                <path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-7z"/>
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H5.5l.5-1h4l.5 1H13.5a1 1 0 0 1 1 1zM6.118 4 5.5 5h5l-.618-1H6.118z"/>
                              </svg>
                            </button>
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-center text-muted small mt-2">{users.length} usuarios</div>
      </main>
      {showCreateDialog && (
        <>
          <div className="modal-backdrop show"></div>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-sm modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Crear usuario</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setShowCreateDialog(false)} disabled={creating}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label small">Nombre</label>
                    <input className="form-control form-control-sm" value={newUser.name} onChange={e => setNewUser(n => ({ ...n, name: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Email</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={newUser.email}
                      onChange={e => setNewUser(n => ({ ...n, email: e.target.value }))}
                      pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                      title="Ingrese un correo válido (ej. usuario@dominio.com)"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Contraseña</label>
                    <input type="password" className="form-control form-control-sm" value={newUser.password} onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Confirmar contraseña</label>
                    <input type="password" className="form-control form-control-sm" value={newUser.confirmPassword} onChange={e => setNewUser(n => ({ ...n, confirmPassword: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Rol</label>
                    <select className="form-select form-select-sm" value={newUser.role} onChange={e => setNewUser(n => ({ ...n, role: e.target.value as 'USER' | 'ADMIN' }))}>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowCreateDialog(false)} disabled={creating}>Cancelar</button>
                  <button className="btn btn-sm btn-primary" onClick={async () => {
                    // Validaciones simples
                    if (!newUser.name || newUser.name.trim() === '') { window.alert('El nombre es requerido'); return }
                    if (!newUser.email || newUser.email.trim() === '') { window.alert('El email es requerido'); return }
                    if (!isValidEmail(newUser.email.trim())) { window.alert('El email no tiene un formato válido'); return }
                    if (!newUser.password || newUser.password.length < 4) { window.alert('La contraseña debe tener al menos 4 caracteres'); return }
                    if (newUser.password !== newUser.confirmPassword) { window.alert('Las contraseñas no coinciden'); return }
                    setCreating(true)
                    try {
                      const created = await createUser({ name: newUser.name.trim(), email: newUser.email.trim(), password: newUser.password, role: newUser.role })
                      // Insertar al inicio de la lista
                      setUsers(prev => [created, ...prev])
                      setShowCreateDialog(false)
                      setNewUser({ name: '', email: '', password: '', confirmPassword: '', role: 'USER' })
                    } catch (err: any) {
                      window.alert(err?.message || 'Error creando usuario')
                    } finally {
                      setCreating(false)
                    }
                  }} disabled={creating}>{creating ? 'Creando...' : 'Crear'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {showDeleteDialog && (
        <>
          <div className="modal-backdrop show"></div>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-sm modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmar borrado</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => { setShowDeleteDialog(false); setUserToDelete(null) }}></button>
                </div>
                <div className="modal-body">
                  <p>¿Eliminar al usuario <strong>{userToDelete?.name}</strong> (ID {userToDelete?.id})?</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowDeleteDialog(false); setUserToDelete(null) }} disabled={deleting}>Cancelar</button>
                  <button className="btn btn-sm btn-danger" onClick={async () => {
                    if (!userToDelete) return
                    setDeleting(true)
                    try {
                      await deleteUser(userToDelete.id)
                      setUsers(prev => prev.filter(x => x.id !== userToDelete.id))
                      setShowDeleteDialog(false)
                      setUserToDelete(null)
                    } catch (err: any) {
                      const msg = err?.message || ''
                      if (msg.includes('403') && msg.includes('Request failed')) {
                        window.alert('Error al eliminar, existen órdenes o items de carrito relacionadas')
                      } else {
                        window.alert(msg || 'Error eliminando usuario')
                      }
                    } finally {
                      setDeleting(false)
                    }
                  }} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
