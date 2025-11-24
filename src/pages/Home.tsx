import { useEffect, useState } from 'react'
import { searchProducts, API_BASE } from '../services/api'
import type { Product } from '../services/api'

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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(0) // API usa 0-based pages
  const [pageSize, setPageSize] = useState(9)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

        async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await searchProducts({ page, pagesize: pageSize, name: '', description: '' })
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

    load()

    return () => {
      mounted = false
    }
  }, [page, pageSize])

  function goTo(pageNumber: number) {
    if (pageNumber < 0) pageNumber = 0
    if (totalPages && pageNumber >= totalPages) pageNumber = totalPages - 1
    setPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ minHeight: 'calc(100vh - 80px)', paddingTop: '2rem' }}>
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
                      <div className="fw-bold">${p.price?.toFixed(2)}</div>
                      <button className="btn btn-sm btn-outline-primary">Ver</button>
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
      </main>
    </div>
  )
}
