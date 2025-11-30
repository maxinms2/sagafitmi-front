import { useEffect, useState, useRef } from 'react'
import { getUserByEmail, getCartByUserId, deleteCartItem, updateCartItemQuantity } from '../services/api'
import type { CartItemDTO } from '../services/api'
import type { OrderDTO } from '../services/api'
import ConfirmOrderModal from './ConfirmOrderModal'
import OrderResultModal from './OrderResultModal'
import CartModal from './CartModal'
// Orders are now a full page (`AdminOrders`) navigated via `onNavigate`

type NavPage = 'home' | 'login' | 'register' | 'products' | 'orders' | 'metrics' | 'metricsProducts' | 'users'

type PropsExtended = {
  onNavigate?: (page: NavPage) => void
  user?: string | null
  onLogout?: () => void
  isAdmin?: boolean
}

export default function NavBar({ onNavigate, user, onLogout, isAdmin }: PropsExtended) {
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
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const adminRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!adminRef.current) return
      if (adminRef.current.contains(e.target as Node)) return
      setShowAdminMenu(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowAdminMenu(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])
  
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
            <nav className="nav d-flex align-items-center">
              {/* Admin menu visible only for users with ADMIN role - placed left of user info */}
              {isAdmin && (
                <div className="nav-item me-2" ref={adminRef}>
                  <div className="dropdown">
                    <button
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                      onClick={e => { e.preventDefault(); setShowAdminMenu(v => !v) }}
                      aria-expanded={showAdminMenu}
                      aria-haspopup="true"
                      id="adminMenu"
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M9.5 1h-3l-.5 2.5H2l1.5 2-1 2.5L4 9l1.5 2.5L6 13h4l.5-1.5L12 9l2-1.5-1-2.5L14 3.5h-4l-.5-2.5z" fill="currentColor" opacity="0.12" />
                        <path d="M8 3v2M8 11v2M3 8h2M11 8h2M4.6 4.6l1.4 1.4M10 10l1.4 1.4M4.6 11.4l1.4-1.4M10 6l1.4-1.4" stroke="currentColor" />
                      </svg>
                      <span className="small fw-medium">Herramientas administrativas</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M3.5 6l4 4 4-4"/>
                      </svg>
                    </button>

                    <div className={`dropdown-menu shadow border-0 rounded-3 p-2${showAdminMenu ? ' show' : ''}`} aria-labelledby="adminMenu" style={{minWidth: 220}}>
                      <a className="dropdown-item d-flex align-items-center gap-2" href="#productos" onClick={e => { e.preventDefault(); setShowAdminMenu(false); onNavigate?.('products') }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                          <path d="M2 2h12v4H2z" opacity="0.9" />
                          <path d="M2 8h12v6H2z" opacity="0.6" />
                        </svg>
                        <div>
                          <div className="fw-semibold">Productos</div>
                          <div className="small text-muted">Gestionar catálogo</div>
                        </div>
                      </a>
                      <a className="dropdown-item d-flex align-items-center gap-2" href="#ordenes" onClick={e => { e.preventDefault(); setShowAdminMenu(false); onNavigate?.('orders') }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                          <path d="M2 2h12v3H2z" opacity="0.9" />
                          <path d="M2 7h12v7H2z" opacity="0.6" />
                        </svg>
                        <div>
                          <div className="fw-semibold">Órdenes</div>
                        </div>
                      </a>
                      <a className="dropdown-item d-flex align-items-center gap-2" href="#usuarios" onClick={e => { e.preventDefault(); setShowAdminMenu(false); onNavigate?.('users') }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          <path d="M2 14s1-1 6-1 6 1 6 1-1-4-6-4-6 4-6 4z" opacity="0.9" />
                        </svg>
                        <div>
                          <div className="fw-semibold">Usuarios</div>
                          <div className="small text-muted">Gestionar usuarios</div>
                        </div>
                      </a>
                      <div className="dropdown-divider my-1" />
                      <div className="px-2 py-1">
                        <div className="small text-muted mb-1">Métricas</div>
                        <a className="dropdown-item d-flex align-items-center gap-2 ps-4" href="#ventas" onClick={e => { e.preventDefault(); setShowAdminMenu(false); onNavigate?.('metrics') }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                            <path d="M2 13h2V7H2v6zm4 0h2V3H6v10zm4 0h2v-4h-2v4z" />
                          </svg>
                          <div>
                            <div className="fw-semibold">Ventas</div>
                            <div className="small text-muted">Resumen de ventas</div>
                          </div>
                        </a>
                        <a className="dropdown-item d-flex align-items-center gap-2 ps-4" href="#productos-metricas" onClick={e => { e.preventDefault(); setShowAdminMenu(false); onNavigate?.('metricsProducts') }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                            <path d="M3 2h10v4H3z" opacity="0.9" />
                            <path d="M3 8h10v6H3z" opacity="0.6" />
                          </svg>
                          <div>
                            <div className="fw-semibold">Productos</div>
                            <div className="small text-muted">Ventas por producto</div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

      <CartModal
        visible={showCart}
        onClose={() => setShowCart(false)}
        items={cartItems}
        loading={cartLoading}
        error={cartError}
        deletingIds={deletingIds}
        updatingIds={updatingIds}
        qtyErrors={qtyErrors}
        onDeleteItem={handleDeleteItem}
        onChangeQty={changeQtyBy}
        onGenerateOrder={() => setShowConfirmOrder(true)}
        creatingOrder={creatingOrder}
        total={cartItems.reduce((s, it) => s + ((it.currentPrice || it.product.price) * it.quantity), 0)}
      />
      {/* Orders handled as a full page (AdminOrders) via navigation */}
      <ConfirmOrderModal
        visible={showConfirmOrder}
        onClose={() => setShowConfirmOrder(false)}
        user={user}
        total={cartItems.reduce((s, it) => s + ((it.currentPrice || it.product.price) * it.quantity), 0)}
        onConfirmSuccess={(resp) => {
          setOrderResult(resp)
          setShowOrderResult(true)
          setShowConfirmOrder(false)
          // clear cart UI and close cart modal
          setCartItems([])
          setCartCount(0)
          setShowCart(false)
          window.dispatchEvent(new Event('cart-updated'))
        }}
        onError={(msg) => setCartError(msg)}
        setCreatingOrder={(v: boolean) => setCreatingOrder(v)}
      />

      <OrderResultModal
        visible={showOrderResult && !!orderResult}
        order={orderResult}
        onClose={() => { setShowOrderResult(false); setShowCart(false); }}
      />
    </>
  )
}
