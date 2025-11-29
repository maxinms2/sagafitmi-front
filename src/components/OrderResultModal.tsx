import { useEffect, useState } from 'react'
import type { OrderDTO, CartItemDTO } from '../services/api'
import { getCartPriceMismatch } from '../services/api'

type Props = {
  visible: boolean
  order: OrderDTO | null
  onClose: () => void
}

export default function OrderResultModal({ visible, order, onClose }: Props) {
  if (!visible || !order) return null

  const [mismatchItems, setMismatchItems] = useState<CartItemDTO[]>([])
  const [, setMismatchLoading] = useState(false)
  const [, setMismatchError] = useState<string | null>(null)

  useEffect(() => {
    if (!order) return
    let mounted = true
    const userId = order.userId
    async function loadMismatch() {
      setMismatchError(null)
      setMismatchLoading(true)
      try {
        const items = await getCartPriceMismatch(userId)
        if (mounted) setMismatchItems(items)
      } catch (e: any) {
        console.warn('Error loading price mismatch for order result', e)
        if (mounted) setMismatchError(e?.message || String(e))
      } finally {
        if (mounted) setMismatchLoading(false)
      }
    }
    loadMismatch()
    return () => { mounted = false }
  }, [order])

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1090 }}>
      <div className="modal-backdrop fade show" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose}></div>
      <div className="card shadow" style={{ width: 'min(720px, 95%)', zIndex: 1100 }} role="dialog" aria-modal="true">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">Orden generada</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cerrar</button>
        </div>
        <div className="card-body">
          {(() => {
            try {
              const d = new Date(order.createdAt)
              const yy = String(d.getFullYear()).slice(-2)
              const mm = String(d.getMonth() + 1).padStart(2, '0')
              const dd = String(d.getDate()).padStart(2, '0')
              const folio = `ODRS-${yy}${mm}${dd}-${order.id}`
              return (
                <div className="mb-2"><strong>Folio:</strong> {folio}</div>
              )
            } catch (e) {
              return null
            }
          })()}
          <div className="mb-3">
            <div><strong>Fecha de compra:</strong> {new Date(order.createdAt).toLocaleString()}</div>
            {
              // compute adjusted total: if there are mismatchItems, use their product.price as the new price
            }
            {(() => {
              const mismatchMap = new Map<number, CartItemDTO>()
              mismatchItems.forEach(mi => { if (mi?.product?.id) mismatchMap.set(mi.product.id, mi) })
              const adjustedTotal = order.items.reduce((s, it) => {
                const mi = mismatchMap.get(it.product.id)
                const displayPrice = mi ? mi.product.price : it.price
                return s + (displayPrice * it.quantity)
              }, 0)
              return (
                <div>
                  <div><strong>Total:</strong> ${ (mismatchItems.length > 0 ? adjustedTotal : order.total).toFixed(2) }</div>
                  {mismatchItems.length > 0 && <div className="text-muted small">Total original: ${order.total.toFixed(2)}</div>}
                </div>
              )
            })()}
          </div>
          <div>
            <h6>Artículos</h6>
            <div style={{ maxHeight: '36vh', overflowY: 'auto' }}>
              <ul className="list-group">
                {order.items.map((it, idx) => {
                  const mi = mismatchItems.find(m => m.product.id === it.product.id)
                  const displayPrice = mi ? mi.product.price : it.price
                  return (
                    <li key={idx} className="list-group-item">
                      <div className="fw-semibold">{it.product.name}</div>
                      <div className="text-muted small">{it.product.description}</div>
                      <div className="d-flex justify-content-between mt-2">
                        <div>Cantidad: {it.quantity}</div>
                        <div>Precio: ${displayPrice.toFixed(2)} — Subtotal: ${(displayPrice * it.quantity).toFixed(2)}</div>
                      </div>
                      {mi && (
                        <div className="text-muted small mt-1">Precio anterior: ${mi.currentPrice.toFixed(2)}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end">
          <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
