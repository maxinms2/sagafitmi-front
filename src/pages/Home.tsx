import { useEffect, useState, useRef } from 'react'
import { searchProducts, API_BASE, addToCartByUserEmail, getProductImages } from '../services/api'
import { formatCurrency } from '../utils/format'
import type { Product } from '../services/api'
import { getUser as getStoredUser } from '../services/storage'

const PLACEHOLDER = 'https://via.placeholder.com/400x300?text=No+image'

function ProductImage({ src, alt, placeholder }: { src: string; alt: string; placeholder: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Skeleton */}
      {!loaded && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg,#f0f0f0,#e8e8e8,#f0f0f0)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-anim 1.2s linear infinite',
          }}
        />
      )}

      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          transition: 'opacity 300ms ease',
          opacity: loaded ? 1 : 0,
          display: 'block',
        }}
        onLoad={() => setLoaded(true)}
        onError={(e: any) => {
          if (e.currentTarget.src !== placeholder) {
            e.currentTarget.src = placeholder
          }
        }}
      />

      <style>{`@keyframes skeleton-anim { from { background-position: 200% 0 } to { background-position: -200% 0 } }`}</style>
    </div>
  )
}

function resolveImageUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${API_BASE}${url}`
  return `${API_BASE}/${url}`
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(0) // API usa 0-based pages
  const [pageSize, setPageSize] = useState(9)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameFilter, setNameFilter] = useState('')
  const [descriptionFilter, setDescriptionFilter] = useState('')
  // Modal para ver imagen ampliada (incluye datos del producto)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<{
    src: string
    alt: string
    id?: number
    name?: string
    description?: string
    price?: number
  } | null>(null)
  const [modalImages, setModalImages] = useState<{ id: number; url: string; mainImage: boolean }[]>([])
  const [modalLoadingImages, setModalLoadingImages] = useState(false)
  const [modalCurrent, setModalCurrent] = useState(0)
  const [modalQuantity, setModalQuantity] = useState<number>(1)

  const [notification, setNotification] = useState<{
    variant: 'success' | 'warning' | 'danger' | 'info'
    title?: string
    message: string
  } | null>(null)
  const timeoutRef = useRef<number | null>(null)

  function showNotification(
    variant: 'success' | 'warning' | 'danger' | 'info',
    message: string,
    title?: string,
    duration = 4000
  ) {
    setNotification({ variant, title, message })
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setNotification(null)
      timeoutRef.current = null
    }, duration)
  }

  // extraemos la función de carga para poder invocarla desde el formulario de búsqueda
  useEffect(() => {
    let mounted = true

    async function fetchProducts(params?: { page?: number; pagesize?: number; name?: string; description?: string }) {
      setLoading(true)
      setError(null)
      try {
        const resp = await searchProducts({
          page: params?.page ?? page,
          pagesize: params?.pagesize ?? pageSize,
          name: params?.name ?? nameFilter,
          description: params?.description ?? descriptionFilter,
        })
        if (!mounted) return
        setProducts(resp.content || [])
        setTotalPages(resp.totalPages ?? 0)
        setTotalElements(resp.totalElements ?? (resp.content ? resp.content.length : 0))
      } catch (err: any) {
        if (!mounted) return
        setError(err.message || 'Error al obtener productos')
        setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // cargar en montado y cuando cambian página, tamaño de página, o filtros
    fetchProducts()

    return () => {
      mounted = false
    }
  }, [page, pageSize, nameFilter, descriptionFilter])

  function goTo(pageNumber: number) {
    if (pageNumber < 0) pageNumber = 0
    if (totalPages && pageNumber >= totalPages) pageNumber = totalPages - 1
    setPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Abrir / cerrar modal
  const openModal = (src: string, product?: Product) => {
    setModalProduct({
      id: product?.id,
      src,
      alt: product?.name ?? '',
      name: product?.name,
      description: product?.description,
      price: product?.price,
    })
    setModalQuantity(1)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalProduct(null)
    setModalImages([])
    setModalCurrent(0)
  }

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal()
    }
    if (modalOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  // cargar imágenes del producto cuando se abre la modal con un product id
  useEffect(() => {
    const productId = modalProduct?.id
    if (!modalOpen || productId == null) return
    let mounted = true
    async function loadImgs() {
      setModalLoadingImages(true)
      try {
        const imgs = await getProductImages(productId as number)
        if (!mounted) return
        setModalImages(imgs || [])
        // seleccionar la imagen principal si existe
        const mainIndex = imgs?.findIndex((i: any) => i.mainImage) ?? -1
        if (mainIndex >= 0) setModalCurrent(mainIndex)
        else setModalCurrent(0)
      } catch (e: any) {
        // no bloquear: dejar el src proporcionado como fallback
        setModalImages([])
      } finally {
        if (mounted) setModalLoadingImages(false)
      }
    }
    void loadImgs()
    return () => { mounted = false }
  }, [modalOpen, modalProduct?.id])

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ minHeight: 'calc(100vh - 80px)', paddingTop: '2rem' }}>
        {/* Notificación flotante (Bootstrap alert) */}
        {notification && (
          <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, minWidth: 320 }}>
            <div className={`alert alert-${notification.variant} alert-dismissible fade show`} role="alert">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {notification.title && <strong className="me-1">{notification.title}</strong>}
                  <div>{notification.message}</div>
                </div>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setNotification(null)} />
              </div>
            </div>
          </div>
        )}
        <header className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h1 className="h4 mb-0">Productos</h1>
            <div className="text-muted small">Explora nuestra oferta — Página {page + 1}{totalPages ? ` de ${totalPages}` : ''}</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">Mostrar</label>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
            </select>
          </div>
        </header>

        {/* Búsqueda / filtros */}
        <form
          className="row g-2 align-items-center mb-4"
          onSubmit={(e) => {
            e.preventDefault()
            // al enviar, pasamos página a 0 para ver resultados desde el inicio
            setPage(0)
          }}
        >
          <div className="col-auto">
            <input
              className="form-control form-control-sm"
              placeholder="Buscar por nombre"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div className="col-auto">
            <input
              className="form-control form-control-sm"
              placeholder="Buscar por descripción"
              value={descriptionFilter}
              onChange={(e) => setDescriptionFilter(e.target.value)}
            />
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setNameFilter('')
                setDescriptionFilter('')
                setPage(0)
              }}
            >
              Limpiar
            </button>
          </div>
        </form>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className={`alert ${error.startsWith('403') ? 'alert-warning' : 'alert-danger'}`} role="alert">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                {error.startsWith('403') ? (
                  <>
                    <strong>Acceso denegado.</strong> Necesitas iniciar sesión para ver los productos.
                    <div className="small text-muted">Inicia sesión para ver productos privados o revisa la configuración del backend.</div>
                  </>
                ) : (
                  error
                )}
              </div>
              {error.startsWith('403') && (
                <div>
                  <a className="btn btn-sm btn-primary" href="/login">Iniciar sesión</a>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center text-muted py-5">No se encontraron productos.</div>
        )}

        <div className="row g-4">
          {products.map((p) => {
            const rawPath = (p.mainImageUrl ?? '').toString().trim()
            // Normalizamos backslashes a slashes para formar una URL válida
            const normalized = rawPath.replace(/\\/g, '/')

            // Si ya es una URL absoluta la usamos tal cual.
            // Si empieza por '/', usamos API_BASE + mainImageUrl (exactamente lo que pediste).
            // Si no empieza por '/', también la prefijamos con '/' entre API_BASE y la ruta.
            let imageSrc = PLACEHOLDER
            if (normalized) {
              if (/^https?:\/\//i.test(normalized)) {
                imageSrc = normalized
              } else if (normalized.startsWith('/')) {
                imageSrc = `${API_BASE}${normalized}`
              } else {
                imageSrc = `${API_BASE}/${normalized}`
              }
            }

            return (
              <div key={p.id} className="col-12 col-sm-6 col-md-4">
                <article className="card h-100 shadow-sm">
                  <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                      <ProductImage src={imageSrc} alt={p.name} placeholder={PLACEHOLDER} />
                    </div>
                  <div className="card-body d-flex flex-column">
                    <h2 className="h6 card-title mb-1">{p.name}</h2>
                    <p className="card-text text-muted small mb-2" style={{ flex: 1 }}>{p.description}</p>
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <div className="fw-bold">{formatCurrency(p.price)}</div>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openModal(imageSrc, p)}>Ver</button>
                    </div>
                  </div>
                </article>
              </div>
            )
          })}
        </div>

        {/* Pagination controls */}
        <nav className="d-flex justify-content-center align-items-center mt-4" aria-label="Paginación de productos">
          <ul className="pagination mb-0">
            <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goTo(page - 1)} aria-label="Anterior">&laquo;</button>
            </li>

            {Array.from({ length: Math.max(1, totalPages || 1) }).map((_, i) => {
              // Limitar botones si hay muchas páginas: mostrar ventana centrada
              const maxButtons = 9
              let start = 0
              if ((totalPages || 0) > maxButtons) {
                const half = Math.floor(maxButtons / 2)
                start = Math.max(0, Math.min((totalPages || 0) - maxButtons, page - half))
              }
              const index = start + i
              if (index >= (totalPages || 1)) return null
              return (
                <li key={index} className={`page-item ${index === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => goTo(index)}>{index + 1}</button>
                </li>
              )
            })}

            <li className={`page-item ${totalPages && page >= totalPages - 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goTo(page + 1)} aria-label="Siguiente">&raquo;</button>
            </li>
          </ul>
        </nav>

        <div className="text-center text-muted small mt-2">{totalElements} productos</div>
        {/* Modal de imagen ampliada */}
        {modalOpen && modalProduct && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={closeModal}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '95vw',
                maxHeight: '90vh',
                width: 'min(1100px,95%)',
                background: '#fff',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <button
                aria-label="Cerrar"
                onClick={closeModal}
                style={{ position: 'absolute', right: 8, top: 8, zIndex: 2, background: 'transparent', color: '#333', border: 'none', fontSize: 20, width: 36, height: 36 }}
              >
                ×
              </button>

              <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 12 }}>
                  {modalLoadingImages ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div>
                    </div>
                  ) : modalImages && modalImages.length > 0 ? (
                    <div style={{ width: '100%', maxWidth: 720 }}>
                      <div className="d-flex align-items-center justify-content-center mb-2" style={{ height: 420 }}>
                        <button className="btn btn-sm btn-outline-secondary me-2" type="button" onClick={() => setModalCurrent(i => (i - 1 + modalImages.length) % modalImages.length)} aria-label="Anterior">◀</button>
                        <div style={{ width: '100%', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f8f9fa', borderRadius: 6 }}>
                          <img
                            src={resolveImageUrl(modalImages[modalCurrent].url)}
                            alt={modalProduct?.alt || modalProduct?.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                            onError={(e: any) => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER }}
                          />
                        </div>
                        <button className="btn btn-sm btn-outline-secondary ms-2" type="button" onClick={() => setModalCurrent(i => (i + 1) % modalImages.length)} aria-label="Siguiente">▶</button>
                      </div>
                      <div className="text-center small text-muted mb-2">{`Imagen ${modalCurrent + 1} de ${modalImages.length}`}</div>
                      {/* Thumbnails removed: carousel is read-only and shows only the main image with prev/next */}
                    </div>
                  ) : (
                    <img
                      src={modalProduct.src}
                      alt={modalProduct.alt || modalProduct.name}
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block', background: '#fff' }}
                      onError={(e: any) => {
                        if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER
                      }}
                    />
                  )}
                </div>
                <aside style={{ width: 340, maxWidth: '40%', padding: 16, boxSizing: 'border-box', borderLeft: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 className="h5 mb-0">{modalProduct.name}</h3>
                  <div className="text-muted small" style={{ flex: 1 }}>{modalProduct.description}</div>
                  <div className="fw-bold" style={{ fontSize: 18 }}>{formatCurrency(modalProduct.price)}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label className="small text-muted mb-0">Cantidad</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                        type="button"
                        aria-label="Disminuir cantidad"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={modalQuantity}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setModalQuantity(Number.isNaN(v) || v < 1 ? 1 : Math.floor(v))
                        }}
                        style={{ width: 64, textAlign: 'center' }}
                      />
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setModalQuantity((q) => q + 1)}
                        type="button"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        try {
                          const stored = getStoredUser()
                          if (!stored) {
                            showNotification('warning', 'Debes iniciar sesión para agregar productos al carrito', 'Acceso requerido')
                            return
                          }
                          // stored is the user email (como guarda App.tsx)
                          const productId = modalProduct?.id
                          if (!productId) {
                            showNotification('danger', 'Producto inválido', 'Error')
                            return
                          }
                          await addToCartByUserEmail(stored, productId, modalQuantity)
                          // La llamada anterior resolverá userId y retornará el item creado
                          // Notify other components (NavBar) that cart changed
                          try {
                            window.dispatchEvent(new CustomEvent('cart-updated'))
                          } catch (e) {
                            // fallback no-op
                          }
                          showNotification(
                            'success',
                            'Gracias — el producto se ha añadido al carrito con éxito. Revisa tu carrito para continuar con la compra.'
                          )
                        } catch (err: any) {
                          console.error('Error al añadir al carrito', err)
                          showNotification('danger', err?.message || 'Error al añadir al carrito', 'Error')
                        } finally {
                          // Cerrar el modal independientemente del resultado
                          closeModal()
                        }
                      }}
                    >
                      Agregar al carrito
                    </button>
                    <button className="btn btn-outline-secondary" onClick={closeModal}>Cerrar</button>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
