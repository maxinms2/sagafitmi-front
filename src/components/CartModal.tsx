// React import not required with the automatic JSX runtime
import type { CartItemDTO } from '../services/api'
import { formatCurrency } from '../utils/format'

type Props = {
  visible: boolean
  onClose: () => void
  items: CartItemDTO[]
  loading: boolean
  error?: string | null
  deletingIds: number[]
  updatingIds: number[]
  qtyErrors: Record<number, string>
  onDeleteItem: (id: number) => void
  onChangeQty: (id: number, delta: number) => void
  onGenerateOrder: () => void
  creatingOrder?: boolean
  total: number
}

export default function CartModal({ visible, onClose, items, loading, error, deletingIds, updatingIds, qtyErrors, onDeleteItem, onChangeQty, onGenerateOrder, creatingOrder, total }: Props) {
  if (!visible) return null

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center" style={{ zIndex: 1050, paddingTop: '4rem' }}>
      <div className="modal-backdrop fade show" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose}></div>
      <div className="card shadow" style={{ width: 'min(720px, 95%)', zIndex: 1060, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} role="dialog" aria-modal="true">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">Tu carrito</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cerrar</button>
        </div>
        <div className="card-body" style={{ overflowY: 'auto', flex: '1 1 auto', padding: '1rem' }}>
          {loading && <div>Cargando...</div>}
          {error && <div className="text-danger">Error: {error}</div>}
          {!loading && items.length === 0 && !error && <div>Tu carrito está vacío.</div>}
          {!loading && items.length > 0 && (
            <div>
              <ul className="list-group mb-3">
                {items.map(it => (
                  <li key={it.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div style={{ minWidth: '45%' }}>
                      <div className="fw-semibold">{it.product.name}</div>
                      <div className="d-flex align-items-center gap-2">
                        <label className="text-muted small mb-0">Cantidad:</label>
                        <div className="d-flex align-items-center">
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            readOnly
                            disabled={updatingIds.includes(it.id) || deletingIds.includes(it.id)}
                            className="form-control form-control-sm mx-1"
                            style={{ width: '4.5rem', textAlign: 'center', WebkitAppearance: 'none', MozAppearance: 'textfield', appearance: 'textfield' }}
                          />
                          <div className="d-flex flex-column ms-1">
                            <button
                              className="btn btn-sm btn-outline-secondary p-0 d-flex align-items-center justify-content-center"
                              style={{ width: '28px', height: '18px', borderRadius: '2px' }}
                              type="button"
                              onClick={() => onChangeQty(it.id, +1)}
                              disabled={updatingIds.includes(it.id) || deletingIds.includes(it.id)}
                              aria-label={`Aumentar cantidad de ${it.product.name}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M1 6l5-4 5 4" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary p-0 d-flex align-items-center justify-content-center mt-1"
                              style={{ width: '28px', height: '18px', borderRadius: '2px' }}
                              type="button"
                              onClick={() => onChangeQty(it.id, -1)}
                              disabled={updatingIds.includes(it.id) || deletingIds.includes(it.id)}
                              aria-label={`Disminuir cantidad de ${it.product.name}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M1 2l5 4 5-4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {updatingIds.includes(it.id) && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                      </div>
                      {qtyErrors[it.id] && <div className="text-danger small mt-1">{qtyErrors[it.id]}</div>}
                    </div>
                    <div className="text-end d-flex align-items-center gap-2">
                      <div className="me-2 text-end">
                        <div>{formatCurrency(it.currentPrice || it.product.price)}</div>
                        <div className="text-muted small">Subtotal: {formatCurrency((it.currentPrice || it.product.price) * it.quantity)}</div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger p-1 d-inline-flex align-items-center justify-content-center"
                        onClick={() => onDeleteItem(it.id)}
                        disabled={deletingIds.includes(it.id)}
                        aria-label={`Eliminar ${it.product.name}`}
                        title="Eliminar"
                      >
                        {deletingIds.includes(it.id) ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="card-footer border-top d-flex justify-content-end align-items-center" style={{ flex: '0 0 auto', padding: '0.75rem 1rem' }}>
          <div className="me-auto">
            <button className="btn btn-primary" onClick={onGenerateOrder} disabled={items.length === 0 || creatingOrder}>
              Generar orden de compra
            </button>
          </div>
          <div className="fw-semibold text-primary fs-5">Total: {formatCurrency(total)}</div>
        </div>
      </div>
    </div>
  )
}
