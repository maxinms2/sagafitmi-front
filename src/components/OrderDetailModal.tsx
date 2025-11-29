import { useEffect, useState } from 'react'
import { getOrderById, getUserById, updateOrderStatus } from '../services/api'
import type { OrderDTO, UserResponse } from '../services/api'
import { isAdmin } from '../services/jwt'

// Selector de estado usado en el modal. Si el usuario no es admin muestra etiqueta estática.
function OrderStatusSelector({ current, onChange }: { current: string; onChange: (s: string) => Promise<void> | void }) {
  const [value, setValue] = useState(current)
  const admin = isAdmin()

  useEffect(() => { setValue(current) }, [current])

  const OPTIONS: { value: string; label: string }[] = [
    { value: 'NEW', label: 'NUEVA' },
    { value: 'PROCESSING', label: 'EN PROCESO' },
    { value: 'COMPLETED', label: 'COMPLETADA' },
    { value: 'CANCELLED', label: 'CANCELADA' },
  ]

  if (!admin) {
    const lbl = OPTIONS.find(o => o.value === value)?.label ?? value
    return <span className="ms-2">{lbl}</span>
  }

  return (
    <select className="form-select form-select-sm d-inline-block" style={{ width: 180 }} value={value} onChange={e => { setValue(e.target.value); onChange(e.target.value) }}>
      {OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

type Props = {
  orderId: number | null
  show: boolean
  onClose: () => void
  onOrderUpdated?: (order: OrderDTO) => void
}

// NOTE: status labels for the admin list live in `AdminOrders`.

export default function OrderDetailModal({ orderId, show, onClose, onOrderUpdated }: Props) {
  const [order, setOrder] = useState<OrderDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UserResponse | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [, setUserError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!show || orderId == null) return
      setLoading(true)
      setError(null)
      try {
        const o = await getOrderById(orderId)
        if (!mounted) return
        setOrder(o)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Error al cargar la orden')
        setOrder(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [orderId, show])

  useEffect(() => {
    let mounted = true
    async function loadUser() {
      if (!show || !order?.userId) {
        setUser(null)
        setUserError(null)
        setUserLoading(false)
        return
      }
      setUserLoading(true)
      setUserError(null)
      try {
        const u = await getUserById(order.userId)
        if (!mounted) return
        setUser(u)
      } catch (e: any) {
        if (!mounted) return
        setUser(null)
        setUserError(e?.message || 'Error al cargar el usuario')
      } finally {
        if (mounted) setUserLoading(false)
      }
    }

    loadUser()
    return () => { mounted = false }
  }, [order?.userId, show])

  if (!show) return null

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Detalle de orden {orderId}</h5>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading && <div className="text-center py-3"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div></div>}
            {error && <div className="alert alert-danger">{error}</div>}

            {!loading && !error && !order && (
              <div className="text-muted">No se encontró la orden.</div>
            )}

            {!loading && order && (
              <div>
                <div className="d-flex justify-content-between mb-3">
                  <div>
                    <div>
                      <div className="border rounded p-3 mb-2" style={{ maxWidth: 320 }}>
                        <div className="text-uppercase small fw-bolder text-muted mb-2">COMPRADOR</div>
                        {userLoading && <div className="text-muted">Cargando usuario...</div>}
                        {!userLoading && user && (
                          <div>
                            <div>Nombre: <span className="">{user.name}</span></div>
                            <div className="small text-muted">Correo: <a href={`mailto:${user.email}`} className="text-decoration-none ms-1">{user.email}</a></div>
                          </div>
                        )}
                        {!userLoading && !user && (
                          <div className="text-muted">Usuario no disponible</div>
                        )}
                      </div>

                      <div className="mb-2">
                        <strong className="me-2">Estado:</strong>
                        <OrderStatusSelector current={order.status} onChange={async (newStatus) => {
                          // actualizar status
                          try {
                            setLoading(true)
                            setError(null)
                            const updated = await updateOrderStatus(order.id, newStatus)
                            setOrder(updated)
                            // notify parent/list about update
                            // eslint-disable-next-line no-console
                            console.log('OrderDetailModal: updated order from API', updated)
                            if (typeof onOrderUpdated === 'function') onOrderUpdated(updated)
                          } catch (e: any) {
                            setError(e?.message || 'Error al actualizar estado')
                          } finally {
                            setLoading(false)
                          }
                        }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <div><strong>Creada:</strong> {new Date(order.createdAt).toLocaleString()}</div>
                    <div>
                      <strong>Total:</strong>
                      <span className="ms-2 fw-bold text-primary">${order.total?.toFixed?.(2)}</span>
                    </div>
                  </div>
                </div>

                <h6>Items</h6>
                <div className="table-responsive" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: '4%' }}>#</th>
                        <th>Producto</th>
                        <th style={{ width: '8%' }}>Cant</th>
                        <th style={{ width: '12%' }}>Precio</th>
                        <th style={{ width: '12%' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((it, idx) => (
                        <tr key={it.id} className={idx % 2 === 0 ? '': ''}>
                          <td className="text-muted">{idx + 1}</td>
                          <td>{it.product?.name ?? '—'}</td>
                          <td>{it.quantity}</td>
                          <td className="text-end">${it.price?.toFixed?.(2)}</td>
                          <td className="text-end">${(it.price * it.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
