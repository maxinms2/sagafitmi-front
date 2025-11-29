import { useState, useEffect, useRef } from 'react'
import { postMetricsOrders, getAllProducts, getUsers } from '../services/api'
import type { MetricsOrderItem, Product, UserResponse } from '../services/api'

type Props = { onBack?: () => void }

export default function SalesMetrics({ onBack }: Props) {
  function todayYMD() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function firstOfMonthYMD() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  }

  const [startDate, setStartDate] = useState<string>(firstOfMonthYMD())
  const [endDate, setEndDate] = useState<string>(todayYMD())
  // Sólo usamos fechas por ahora; filtros adicionales se omiten
  const [statuses, setStatuses] = useState<string[]>([])

  const [items, setItems] = useState<MetricsOrderItem[]>([])
  const [grandTotal, setGrandTotal] = useState<number>(0)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [productFilter, setProductFilter] = useState<string>('')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  // Usuarios (combobox similar a Productos)
  const [users, setUsers] = useState<UserResponse[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState<string>('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  // Nuevo: descripciones derivadas de products
  const [descriptions, setDescriptions] = useState<string[]>([])
  const [descriptionFilter, setDescriptionFilter] = useState<string>('')
  const [filteredDescriptions, setFilteredDescriptions] = useState<string[]>([])
  const [selectedProductDescriptions, setSelectedProductDescriptions] = useState<string[]>([])
  const [showDescriptionDropdown, setShowDescriptionDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Refs para detectar clicks fuera (click-away)
  const statusRef = useRef<HTMLDivElement | null>(null)
  const productRef = useRef<HTMLDivElement | null>(null)
  const descriptionRef = useRef<HTMLDivElement | null>(null)
  const userRef = useRef<HTMLDivElement | null>(null)

  // Cierra dropdowns al hacer click fuera de ellos
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        statusRef.current?.contains(target) ||
        productRef.current?.contains(target) ||
        descriptionRef.current?.contains(target) ||
        userRef.current?.contains(target)
      ) {
        // click dentro de algún dropdown -> no cerrar
        return
      }
      setShowStatusDropdown(false)
      setShowProductDropdown(false)
      setShowDescriptionDropdown(false)
      setShowUserDropdown(false)
    }

    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // Cargar productos una sola vez al montar la página
  useEffect(() => {
    let mounted = true
    async function load() {
      setProductsLoading(true)
      setProductsError(null)
      setUsersLoading(true)
      setUsersError(null)
      try {
        const [prodResp, usersResp] = await Promise.all([getAllProducts(), getUsers()])
        if (!mounted) return
        const list = prodResp || []
        setProducts(list)
        // extraer descripciones únicas (filtrar nulos/empty)
        const uniq = Array.from(new Set(list.map(p => (p.description || '').trim()).filter(d => d)))
        setDescriptions(uniq)
        // inicializar filteredDescriptions
        setFilteredDescriptions(uniq)
        // usuarios
        setUsers(usersResp || [])
      } catch (err: any) {
        if (!mounted) return
        setProductsError(err?.message || 'Error cargando productos')
        setUsersError(err?.message || 'Error cargando usuarios')
      } finally {
        if (!mounted) return
        setProductsLoading(false)
        setUsersLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // Lista filtrada (no muta `products`, así nunca perdemos la lista original)
  const filteredProducts = products.filter(p => {
    if (!productFilter) return true
    return p.name.toLowerCase().startsWith(productFilter.trim().toLowerCase())
  })

  // Filtrado de descripciones (derivado de `descriptions`)
  useEffect(() => {
    if (!descriptionFilter) {
      setFilteredDescriptions(descriptions)
      return
    }
    setFilteredDescriptions(descriptions.filter(d => d.toLowerCase().startsWith(descriptionFilter.trim().toLowerCase())))
  }, [descriptionFilter, descriptions])

  // Filtrado de usuarios (derivado de `users`) - calculado en el render
  const filteredUsers = users.filter(u => {
    if (!userFilter) return true
    return u.name.toLowerCase().startsWith(userFilter.trim().toLowerCase())
  })

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (endDate < startDate) {
      setFetchError('La fecha final no puede ser anterior a la fecha inicial.')
      return
    }

    setLoading(true)
    setFetchError(null)
    try {
      const resp = await postMetricsOrders({
        startDate,
        endDate,
        statuses: statuses.length ? statuses : undefined,
          productIds: selectedProductIds.length ? selectedProductIds : undefined,
          productDescriptions: selectedProductDescriptions.length ? selectedProductDescriptions : undefined,
          userIds: selectedUserIds.length ? selectedUserIds : undefined,
      })
      setItems(resp.items || [])
      setGrandTotal(resp.grandTotal ?? 0)
    } catch (err: any) {
      setFetchError(err?.message || 'Error al obtener métricas')
      setItems([])
      setGrandTotal(0)
    } finally {
      setLoading(false)
    }
  }

  function formatAmount(n?: number) {
    if (n === undefined || n === null || Number.isNaN(n)) return '-' 
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  }

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ paddingTop: '2rem' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h4 mb-0">Métricas — Ventas</h1>
            <div className="text-muted small">Reporte de ventas por filtros</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {onBack ? <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>Volver</button> : null}
          </div>
        </div>

        <form className="row g-2 align-items-center mb-3" onSubmit={doSearch}>
          <div className="col-auto">
            <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="col-auto">
            <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="col-auto">
            <div className="dropdown" ref={statusRef}>
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" onClick={() => {
                  // Alternar visibilidad y cerrar el dropdown de productos si abrimos este
                  setShowStatusDropdown(prev => {
                    const next = !prev
                    if (next) {
                      setShowProductDropdown(false)
                      setShowDescriptionDropdown(false)
                      setShowUserDropdown(false)
                    }
                    return next
                  })
                }} aria-expanded={showStatusDropdown}>
                  Estados {statuses.length ? `(${statuses.length})` : ''}
                </button>

              <div className={`dropdown-menu p-3 ${showStatusDropdown ? 'show' : ''}`} style={{ minWidth: 220 }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-semibold">Estados</div>
                  <div>
                    <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setStatuses(['NEW','PROCESSING','COMPLETED','CANCELLED'])}>Seleccionar todos</button>
                    <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setStatuses([])}>Limpiar</button>
                  </div>
                </div>
                <div className="d-flex flex-column gap-1">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" value="NEW" id="st-new" checked={statuses.includes('NEW')} onChange={e => {
                      const v = e.target.value
                      setStatuses(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
                    }} />
                    <label className="form-check-label" htmlFor="st-new">NUEVAS</label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" value="PROCESSING" id="st-processing" checked={statuses.includes('PROCESSING')} onChange={e => {
                      const v = e.target.value
                      setStatuses(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
                    }} />
                    <label className="form-check-label" htmlFor="st-processing">EN PROCESO</label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" value="COMPLETED" id="st-completed" checked={statuses.includes('COMPLETED')} onChange={e => {
                      const v = e.target.value
                      setStatuses(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
                    }} />
                    <label className="form-check-label" htmlFor="st-completed">COMPLETADAS</label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" value="CANCELLED" id="st-cancelled" checked={statuses.includes('CANCELLED')} onChange={e => {
                      const v = e.target.value
                      setStatuses(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
                    }} />
                    <label className="form-check-label" htmlFor="st-cancelled">CANCELADAS</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Buscador movido al final para quedar a la derecha */}
          <div className="col-auto">
            <div className="dropdown" ref={productRef}>
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" onClick={() => {
                  // Alternar visibilidad y cerrar los otros dropdowns si abrimos este
                  setShowProductDropdown(prev => {
                    const next = !prev
                    if (next) {
                      setShowStatusDropdown(false)
                      setShowDescriptionDropdown(false)
                      setShowUserDropdown(false)
                    }
                    return next
                  })
                }} aria-expanded={showProductDropdown}>
                  Productos {selectedProductIds.length ? `(${selectedProductIds.length})` : ''}
                </button>

              <div className={`dropdown-menu p-3 ${showProductDropdown ? 'show' : ''}`} style={{ minWidth: 320, maxHeight: 300, overflow: 'auto' }}>
                <div className="mb-2">
                  <input type="text" className="form-control form-control-sm mb-2" placeholder="Filtrar productos..." value={productFilter} onChange={e => setProductFilter(e.target.value)} />
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="fw-semibold">Productos</div>
                    <div>
                      <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setSelectedProductIds(filteredProducts.map(p => p.id))}>Seleccionar visibles</button>
                      <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setSelectedProductIds([])}>Limpiar</button>
                    </div>
                  </div>
                </div>
                {productsLoading && <div className="text-center py-2">Cargando productos...</div>}
                {productsError && <div className="text-danger small">{productsError}</div>}
                {!productsLoading && !productsError && products.length === 0 && <div className="small text-muted">No se encontraron productos</div>}
                {!productsLoading && !productsError && products.length > 0 && filteredProducts.length === 0 && <div className="small text-muted">No hay coincidencias</div>}
                {!productsLoading && filteredProducts.map(p => (
                  <div className="form-check" key={p.id}>
                    <input className="form-check-input" type="checkbox" id={`prod-${p.id}`} value={p.id} checked={selectedProductIds.includes(p.id)} onChange={e => {
                      const id = Number(e.target.value)
                      setSelectedProductIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
                    }} />
                    <label className="form-check-label small" htmlFor={`prod-${p.id}`}>{p.name}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
            <div className="col-auto">
              <div className="dropdown" ref={descriptionRef}>
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" onClick={() => {
                  // Abrir/Cerrar descripciones y cerrar otros dropdowns
                  setShowDescriptionDropdown(prev => {
                    const next = !prev
                    if (next) {
                      setShowProductDropdown(false)
                      setShowStatusDropdown(false)
                      setShowUserDropdown(false)
                    }
                    return next
                  })
                }} aria-expanded={showDescriptionDropdown}>
                  Descripciones {selectedProductDescriptions.length ? `(${selectedProductDescriptions.length})` : ''}
                </button>

                <div className={`dropdown-menu p-3 ${showDescriptionDropdown ? 'show' : ''}`} style={{ minWidth: 320, maxHeight: 300, overflow: 'auto' }}>
                  <div className="mb-2">
                    <input type="text" className="form-control form-control-sm mb-2" placeholder="Filtrar descripciones..." value={descriptionFilter} onChange={e => setDescriptionFilter(e.target.value)} />
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="fw-semibold">Descripciones</div>
                      <div>
                        <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setSelectedProductDescriptions(filteredDescriptions.map(d => d))}>Seleccionar visibles</button>
                        <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setSelectedProductDescriptions([])}>Limpiar</button>
                      </div>
                    </div>
                  </div>
                  {!productsLoading && descriptions.length === 0 && <div className="small text-muted">No se encontraron descripciones</div>}
                  {!productsLoading && descriptions.length > 0 && filteredDescriptions.length === 0 && <div className="small text-muted">No hay coincidencias</div>}
                  {!productsLoading && filteredDescriptions.map(d => (
                    <div className="form-check" key={d}>
                      <input className="form-check-input" type="checkbox" id={`desc-${encodeURIComponent(d)}`} value={d} checked={selectedProductDescriptions.includes(d)} onChange={e => {
                        const v = e.target.value
                        setSelectedProductDescriptions(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v])
                      }} />
                      <label className="form-check-label small" htmlFor={`desc-${encodeURIComponent(d)}`}>{d}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="dropdown" ref={userRef}>
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" onClick={() => {
                  // Abrir/Cerrar usuarios y cerrar otros dropdowns
                  setShowUserDropdown(prev => {
                    const next = !prev
                    if (next) {
                      setShowProductDropdown(false)
                      setShowStatusDropdown(false)
                      setShowDescriptionDropdown(false)
                    }
                    return next
                  })
                }} aria-expanded={showUserDropdown}>
                  Usuarios {selectedUserIds.length ? `(${selectedUserIds.length})` : ''}
                </button>

                <div className={`dropdown-menu p-3 ${showUserDropdown ? 'show' : ''}`} style={{ minWidth: 320, maxHeight: 300, overflow: 'auto' }}>
                  <div className="mb-2">
                    <input type="text" className="form-control form-control-sm mb-2" placeholder="Filtrar usuarios..." value={userFilter} onChange={e => setUserFilter(e.target.value)} />
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="fw-semibold">Usuarios</div>
                      <div>
                        <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setSelectedUserIds(filteredUsers.map(u => u.id))}>Seleccionar visibles</button>
                        <button className="btn btn-sm btn-link text-decoration-none" type="button" onClick={() => setSelectedUserIds([])}>Limpiar</button>
                      </div>
                    </div>
                  </div>
                  {usersLoading && <div className="text-center py-2">Cargando usuarios...</div>}
                  {usersError && <div className="text-danger small">{usersError}</div>}
                  {!usersLoading && users.length === 0 && <div className="small text-muted">No se encontraron usuarios</div>}
                  {!usersLoading && users.length > 0 && filteredUsers.length === 0 && <div className="small text-muted">No hay coincidencias</div>}
                  {!usersLoading && filteredUsers.map(u => (
                    <div className="form-check" key={u.id}>
                      <input className="form-check-input" type="checkbox" id={`user-${u.id}`} value={u.id} checked={selectedUserIds.includes(u.id)} onChange={e => {
                        const id = Number(e.target.value)
                        setSelectedUserIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
                      }} />
                      <label className="form-check-label small" htmlFor={`user-${u.id}`}>{u.name} ({u.email})</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-auto">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setStartDate(firstOfMonthYMD()); setEndDate(todayYMD()); setItems([]); setGrandTotal(0); setStatuses([]); setSelectedProductIds([]); setSelectedProductDescriptions([]); setSelectedUserIds([]); setProductFilter(''); setDescriptionFilter(''); setUserFilter('') }}>Limpiar</button>
            </div>
            <div className="col" />
          <div className="col-auto">
            <button className="btn btn-sm btn-primary" type="submit" disabled={loading || endDate < startDate}>Buscar</button>
          </div>
        </form>

        {endDate < startDate && (
          <div className="row mb-3"><div className="col-12"><div className="text-danger small">La fecha final no puede ser anterior a la fecha inicial.</div></div></div>
        )}

        {loading && (
          <div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div></div>
        )}

        {fetchError && (
          <div className="alert alert-danger" role="alert">{fetchError}</div>
        )}

        {!loading && !fetchError && (
          <>
            <div className="mb-3">
              <div className="p-3 bg-primary text-white rounded-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="fs-5 fw-bold">Gran Total</div>
                  <div className="small text-white-50">{items.length} {items.length === 1 ? 'registro' : 'registros'}</div>
            
                </div>
                <div className="fs-4 fw-bold">${formatAmount(grandTotal)}</div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-hover table-striped align-middle">
                <thead>
                  <tr>
                    <th style={{ width: '6%' }}>Order ID</th>
                    <th>Estado</th>
                    <th>Producto</th>
                    <th>Descripción</th>
                    <th style={{ width: '12%' }} className="text-end">Precio</th>
                    <th style={{ width: '8%' }} className="text-end">Cantidad</th>
                    <th style={{ width: '12%' }} className="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={`${it.orderId}-${idx}`}>
                      <td className="text-muted">{it.orderId}</td>
                      <td>{it.orderStatus}</td>
                      <td style={{ minWidth: 200 }}>{it.productName}</td>
                      <td style={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.productDescription}</td>
                      <td className="text-end">${formatAmount(it.price)}</td>
                      <td className="text-end">{it.quantity}</td>
                      <td className="text-end fw-semibold">${formatAmount(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
