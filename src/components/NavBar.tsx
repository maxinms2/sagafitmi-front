import { useEffect, useState, useRef } from 'react'
import { getUserByEmail, getCartByUserId, deleteCartItem, updateCartItemQuantity } from '../services/api'
import type { CartItemDTO } from '../services/api'
import type { OrderDTO } from '../services/api'
import ConfirmOrderModal from './ConfirmOrderModal'
import OrderResultModal from './OrderResultModal'
import CartModal from './CartModal'

type NavPage = 'home' | 'login' | 'register' | 'products'

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
                <div className="nav-item dropdown me-2" ref={adminRef}>
                  <button
                    className="nav-link dropdown-toggle text-secondary px-3 btn btn-link"
                    onClick={e => { e.preventDefault(); setShowAdminMenu(v => !v) }}
                    aria-expanded={showAdminMenu}
                    aria-haspopup="true"
                    id="adminMenu"
                    type="button"
                  >
                    Herramientas administrativas
                  </button>
                  <ul className={`dropdown-menu${showAdminMenu ? ' show' : ''}`} aria-labelledby="adminMenu" style={{minWidth: 160}}>
                    <li>
                      <a className="dropdown-item" href="#productos" onClick={e => { e.preventDefault(); setShowAdminMenu(false); onNavigate?.('products') }}>
                        Productos
                      </a>
                    </li>
                  </ul>
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
