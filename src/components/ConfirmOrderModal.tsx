import { useState, useEffect } from 'react'
import { getUserByEmail, createOrderForUser, getCartPriceMismatch } from '../services/api'
import { formatCurrency } from '../utils/format'
import type { OrderDTO, CartItemDTO } from '../services/api'

type Props = {
  visible: boolean
  onClose: () => void
  user?: string | null
  total: number
  onConfirmSuccess: (order: OrderDTO) => void
  onError?: (msg: string) => void
  setCreatingOrder?: (v: boolean) => void
}

export default function ConfirmOrderModal({ visible, onClose, user, total, onConfirmSuccess, onError, setCreatingOrder }: Props) {
  const [creating, setCreating] = useState(false)
  const [mismatchItems, setMismatchItems] = useState<CartItemDTO[]>([])
  const [mismatchLoading, setMismatchLoading] = useState(false)
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadMismatch() {
      if (!visible) return
      setMismatchError(null)
      setMismatchLoading(true)
      try {
        const storedId = sessionStorage.getItem('sagafitmi_user_id')
        let userId: number | null = null
        if (storedId) {
          const parsed = parseInt(storedId, 10)
          if (!isNaN(parsed)) userId = parsed
        }
        if (userId == null && user) {
          const u = await getUserByEmail(user)
          userId = u.id
        }
        if (userId == null) {
          setMismatchItems([])
          return
        }
        const items = await getCartPriceMismatch(userId)
        if (mounted) setMismatchItems(items)
      } catch (e: any) {
        console.warn('Error loading cart price mismatch', e)
        if (mounted) setMismatchError(e?.message || String(e))
      } finally {
        if (mounted) setMismatchLoading(false)
      }
    }
    loadMismatch()
    return () => { mounted = false }
  }, [visible, user])

  const adjustedTotal = mismatchItems.length > 0
    ? total + mismatchItems.reduce((s, it) => {
        const previous = (it.currentPrice ?? it.product.price)
        const current = it.product.price
        return s + ((current - previous) * it.quantity)
      }, 0)
    : total

  if (!visible) return null

  async function handleConfirm() {
    if (setCreatingOrderHelper) setCreatingOrderHelper(true)
    setCreating(true)
    try {
      const storedId = sessionStorage.getItem('sagafitmi_user_id')
      let userId: number | null = null
      if (storedId) {
        const parsed = parseInt(storedId, 10)
        if (!isNaN(parsed)) userId = parsed
      }
      if (userId == null && user) {
        const u = await getUserByEmail(user)
        userId = u.id
      }
      if (userId == null) throw new Error('No se pudo resolver el usuario')

      const resp = await createOrderForUser(userId)
      onConfirmSuccess(resp)
      onClose()
    } catch (e: any) {
      const msg = e?.message || String(e)
      console.error('Error creating order', e)
      onError?.(msg)
    } finally {
      setCreating(false)
      if (setCreatingOrderHelper) setCreatingOrderHelper(false)
    }
  }

  // helper to update parent creating state if provided
  let setCreatingOrderHelper: ((v: boolean) => void) | undefined = undefined
  if (setCreatingOrder) setCreatingOrderHelper = setCreatingOrder

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1070 }}>
      <div className="modal-backdrop fade show" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose}></div>
      <div className="card shadow" style={{ width: 'min(480px, 95%)', zIndex: 1080 }} role="dialog" aria-modal="true">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">Confirmar orden</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cerrar</button>
        </div>
        <div className="card-body">
          <p>
            ¿Deseas generar la orden por un total de <strong>{formatCurrency(adjustedTotal)}</strong>?
            {mismatchItems.length > 0 && (
              <div className="text-muted small">Total original: {formatCurrency(total)}</div>
            )}
          </p>
          <div className="mt-3">
            {mismatchLoading && <div>Procesando...</div>}
            {mismatchError && <div className="text-danger">Error: {mismatchError}</div>}

            {mismatchItems.length > 0 && (
              <>
                <h6 className="mb-2">Productos con ajuste de precio:</h6>
                <div style={{ maxHeight: '28vh', overflowY: 'auto' }}>
                  <ul className="list-group">
                    {mismatchItems.map(it => (
                      <li key={it.id} className="list-group-item">
                        <div className="fw-semibold">{it.product.name}</div>
                        <div className="text-muted small">{it.product.description}</div>
                        <div className="mt-1">
                          Precio anterior: <strong>{formatCurrency((it.currentPrice ?? it.product.price))}</strong>
                          {' '}— Nuevo precio: <strong>{formatCurrency(it.product.price)}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end gap-2">
          <button className="btn btn-secondary" onClick={onClose} disabled={creating || mismatchLoading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={creating || mismatchLoading}>
            {creating ? 'Generando...' : (mismatchLoading ? 'Comprobando...' : 'Confirmar orden')}
          </button>
        </div>
      </div>
    </div>
  )
}
