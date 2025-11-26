import { useEffect, useState } from 'react'
import { getUserByEmail, getCartByUserId, deleteCartItem, updateCartItemQuantity, createOrderForUser } from '../services/api'
import type { CartItemDTO } from '../services/api'
import type { OrderDTO } from '../services/api'

type Props = {
  onNavigate?: (page: 'home' | 'login' | 'register') => void
  user?: string | null
  onLogout?: () => void
}

export default function NavBar({ onNavigate, user, onLogout }: Props) {
  const [cartCount, setCartCount] = useState<number>(0)
  const [showCart, setShowCart] = useState(false)
  const [cartItems, setCartItems] = useState<CartItemDTO[]>([])
  const [cartLoading, setCartLoading] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<number[]>([])
  const [updatingIds, setUpdatingIds] = useState<number[]>([])
  const [qtyErrors, setQtyErrors] = useState<Record<number, string>>({})
  const [showConfirmOrder, setShowConfirmOrder] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [orderResult, setOrderResult] = useState<OrderDTO | null>(null)
  const [showOrderResult, setShowOrderResult] = useState(false)

  async function handleDeleteItem(itemId: number) {
    if (deletingIds.includes(itemId)) return
    setDeletingIds(prev => [...prev, itemId])
    try {
      await deleteCartItem(itemId)
      const newItems = cartItems.filter(it => it.id !== itemId)
      setCartItems(newItems)
      const newCount = newItems.reduce((s, it) => s + (it.quantity || 0), 0)
      setCartCount(newCount)
      // notify other components to refresh badge if needed
      window.dispatchEvent(new Event('cart-updated'))
    } catch (e: any) {
      console.warn('Error deleting cart item', e)
      setCartError(e?.message || String(e))
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== itemId))
    }
  }
  async function changeQtyBy(itemId: number, delta: number) {
    const item = cartItems.find(it => it.id === itemId)
    if (!item) return
    const current = Number(item.quantity) || 0
    const newQ = Math.max(1, current + delta)
    if (newQ === current) return

    // update UI immediately
    setCartItems(prev => prev.map(it => (it.id === itemId ? { ...it, quantity: newQ } : it)))
    setQtyErrors(prev => { const copy = { ...prev }; delete copy[itemId]; return copy })

    if (updatingIds.includes(itemId) || deletingIds.includes(itemId)) return
    setUpdatingIds(prev => [...prev, itemId])
    try {
      const updated = await updateCartItemQuantity(itemId, newQ)
      setCartItems(prev => {
        const next = prev.map(it => (it.id === itemId ? updated : it))
        const newCount = next.reduce((s, it) => s + (it.quantity || 0), 0)
        setCartCount(newCount)
        return next
      })
      window.dispatchEvent(new Event('cart-updated'))
    } catch (e: any) {
      console.warn('Error updating cart item quantity', e)
      setQtyErrors(prev => ({ ...prev, [itemId]: e?.message || String(e) }))
      // revert local UI to previous value
      setCartItems(prev => prev.map(it => (it.id === itemId ? item : it)))
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== itemId))
    }
  }

  

  useEffect(() => {
    let mounted = true

    async function loadCart() {
      if (!user) {
        if (mounted) setCartCount(0)
        return
      }

      try {
        // Prefer explicit stored userId (set by login flow if available)
        const storedId = sessionStorage.getItem('sagafitmi_user_id')
        let userId: number | null = null
        if (storedId) {
          const parsed = parseInt(storedId, 10)
          if (!isNaN(parsed)) userId = parsed
        }

        // If we don't have userId stored, fall back to resolving by email.
        if (userId == null) {
          try {
            const u = await getUserByEmail(user)
            userId = u.id
          } catch (e) {
            // If this fails (403 because endpoint restricted), we cannot resolve id from front
            console.warn('No se pudo resolver userId por email (probable 403):', e)
            if (mounted) setCartCount(0)
            return
          }
        }

        const items = await getCartByUserId(userId)
        const total = items.reduce((s, it) => s + (it.quantity || 0), 0)
        if (mounted) setCartCount(total)
      } catch (e) {
        console.warn('No se pudo cargar carrito para usuario', user, e)
        if (mounted) setCartCount(0)
      }
    }

    // load once when user changes
    loadCart()

    // listen to cart-updated events to refresh the badge
    const handler = () => {
      loadCart()
    }
    window.addEventListener('cart-updated', handler as EventListener)

    return () => {
      mounted = false
      window.removeEventListener('cart-updated', handler as EventListener)
    }
  }, [user])
  const handleLogout = () => {
    try {
      onLogout?.()
    } catch (e) {
      console.warn('Error during logout', e)
    }
    onNavigate?.('home')
  }
  
  return (
    <>
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
                  <button className="btn btn-link text-secondary px-3" onClick={handleLogout}>
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
            <nav className="nav align-items-center">
              <a
                className="nav-link text-secondary px-3 d-flex align-items-center position-relative"
                href="#cart"
                aria-label="Ver carrito"
                title="Carrito de compras"
                onClick={async e => {
                  e.preventDefault()
                  // Si no hay usuario, no responder al clic (inhabilitado)
                  if (!user) return

                  setCartError(null)
                  setCartLoading(true)
                  try {
                    const storedId = sessionStorage.getItem('sagafitmi_user_id')
                    let userId: number | null = null
                    if (storedId) {
                      const parsed = parseInt(storedId, 10)
                      if (!isNaN(parsed)) userId = parsed
                    }
                    if (userId == null) {
                      const u = await getUserByEmail(user)
                      userId = u.id
                    }
                    const items = await getCartByUserId(userId!)
                    setCartItems(items)
                    setShowCart(true)
                  } catch (err: any) {
                    console.warn('Error fetching cart:', err)
                    setCartError(err?.message || String(err))
                  } finally {
                    setCartLoading(false)
                  }
                }}
                aria-disabled={!user}
                style={{ cursor: user ? 'pointer' : 'not-allowed', opacity: user ? 1 : 0.6 }}
                tabIndex={0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                {cartCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary" style={{fontSize: '0.65rem'}}>
                    {cartCount}
                  </span>
                )}
              </a>
            </nav>
          </div>
        </div>
      </div>
    </nav>

      {/* Cart modal */}
      {showCart && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center" style={{zIndex: 1050, paddingTop: '4rem'}}>
          <div className="modal-backdrop fade show" style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)'}} onClick={() => setShowCart(false)}></div>
          <div className="card shadow" style={{width: 'min(720px, 95%)', zIndex: 1060, maxHeight: '70vh', display: 'flex', flexDirection: 'column'}} role="dialog" aria-modal="true">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Tu carrito</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowCart(false)}>Cerrar</button>
            </div>
            <div className="card-body" style={{overflowY: 'auto', flex: '1 1 auto', padding: '1rem'}}>
              {cartLoading && <div>Cargando...</div>}
              {cartError && <div className="text-danger">Error: {cartError}</div>}
              {!cartLoading && cartItems.length === 0 && !cartError && <div>Tu carrito está vacío.</div>}
              {!cartLoading && cartItems.length > 0 && (
                <div>
                  <ul className="list-group mb-3">
                    {cartItems.map(it => (
                      <li key={it.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div style={{minWidth: '45%'}}>
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
                                style={{width: '4.5rem', textAlign: 'center', WebkitAppearance: 'none', MozAppearance: 'textfield', appearance: 'textfield'}}
                              />
                              <div className="d-flex flex-column ms-1">
                                <button
                                  className="btn btn-sm btn-outline-secondary p-0 d-flex align-items-center justify-content-center"
                                  style={{width: '28px', height: '18px', borderRadius: '2px'}}
                                  type="button"
                                  onClick={() => changeQtyBy(it.id, +1)}
                                  disabled={updatingIds.includes(it.id) || deletingIds.includes(it.id)}
                                  aria-label={`Aumentar cantidad de ${it.product.name}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M1 6l5-4 5 4" />
                                  </svg>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary p-0 d-flex align-items-center justify-content-center mt-1"
                                  style={{width: '28px', height: '18px', borderRadius: '2px'}}
                                  type="button"
                                  onClick={() => changeQtyBy(it.id, -1)}
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
                            <div>${(it.currentPrice || it.product.price).toFixed(2)}</div>
                            <div className="text-muted small">Subtotal: ${( (it.currentPrice || it.product.price) * it.quantity ).toFixed(2)}</div>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger p-1 d-inline-flex align-items-center justify-content-center"
                            onClick={() => handleDeleteItem(it.id)}
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
                  {/* Total moved to footer to keep it always visible */}
                </div>
              )}
            </div>
            <div className="card-footer border-top d-flex justify-content-end align-items-center" style={{flex: '0 0 auto', padding: '0.75rem 1rem'}}>
              <div className="me-auto">
                <button className="btn btn-primary" onClick={() => setShowConfirmOrder(true)} disabled={cartItems.length === 0 || creatingOrder}>
                  Generar orden de compra
                </button>
              </div>
              <div className="fw-semibold text-primary fs-5">Total: ${cartItems.reduce((s, it) => s + ((it.currentPrice || it.product.price) * it.quantity), 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
      {/* Confirm order modal */}
      {showConfirmOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{zIndex: 1070}}>
          <div className="modal-backdrop fade show" style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)'}} onClick={() => setShowConfirmOrder(false)}></div>
          <div className="card shadow" style={{width: 'min(480px, 95%)', zIndex: 1080}} role="dialog" aria-modal="true">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Confirmar orden</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowConfirmOrder(false)}>Cerrar</button>
            </div>
            <div className="card-body">
              <p>¿Deseas generar la orden por un total de <strong>${cartItems.reduce((s, it) => s + ((it.currentPrice || it.product.price) * it.quantity), 0).toFixed(2)}</strong>?</p>
            </div>
            <div className="card-footer d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowConfirmOrder(false)} disabled={creatingOrder}>Cancelar</button>
              <button className="btn btn-primary" onClick={async () => {
                setCreatingOrder(true)
                try {
                  // resolve userId similar to loadCart
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
                  setOrderResult(resp)
                  setShowOrderResult(true)
                  setShowConfirmOrder(false)
                  // clear cart UI and close cart modal
                  setCartItems([])
                  setCartCount(0)
                  setShowCart(false)
                  window.dispatchEvent(new Event('cart-updated'))
                } catch (e: any) {
                  console.error('Error creating order', e)
                  setCartError(e?.message || String(e))
                } finally {
                  setCreatingOrder(false)
                }
              }} disabled={creatingOrder}>
                {creatingOrder ? 'Generando...' : 'Confirmar orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order result modal */}
      {showOrderResult && orderResult && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{zIndex: 1090}}>
          <div className="modal-backdrop fade show" style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)'}} onClick={() => { setShowOrderResult(false); setShowCart(false); }}></div>
          <div className="card shadow" style={{width: 'min(720px, 95%)', zIndex: 1100}} role="dialog" aria-modal="true">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Orden generada</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowOrderResult(false); setShowCart(false); }}>Cerrar</button>
            </div>
            <div className="card-body">
              {/* Folio: ODRS-YYMMDD-ID */}
              {(() => {
                try {
                  const d = new Date(orderResult.createdAt)
                  const yy = String(d.getFullYear()).slice(-2)
                  const mm = String(d.getMonth() + 1).padStart(2, '0')
                  const dd = String(d.getDate()).padStart(2, '0')
                  const folio = `ODRS-${yy}${mm}${dd}-${orderResult.id}`
                  return (
                    <div className="mb-2"><strong>Folio:</strong> {folio}</div>
                  )
                } catch (e) {
                  return null
                }
              })()}
              <div className="mb-3">
                <div><strong>Fecha de compra:</strong> {new Date(orderResult.createdAt).toLocaleString()}</div>
                <div><strong>Total:</strong> ${orderResult.total.toFixed(2)}</div>
              </div>
              <div>
                <h6>Artículos</h6>
                <ul className="list-group">
                  {orderResult.items.map((it, idx) => (
                    <li key={idx} className="list-group-item">
                      <div className="fw-semibold">{it.product.name}</div>
                      <div className="text-muted small">{it.product.description}</div>
                      <div className="d-flex justify-content-between mt-2">
                        <div>Cantidad: {it.quantity}</div>
                        <div>Precio: ${it.price.toFixed(2)} — Subtotal: ${(it.price * it.quantity).toFixed(2)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button className="btn btn-primary" onClick={() => { setShowOrderResult(false); setShowCart(false); }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
