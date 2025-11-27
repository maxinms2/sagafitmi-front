import { useEffect, useState } from 'react'
import { searchProducts, updateProduct } from '../services/api'
import type { Product } from '../services/api'

type Props = { onBack?: () => void }

export default function AdminProducts({ onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  // `fetchError` is used for errors that occur when loading the product list.
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [nameFilter, setNameFilter] = useState('')
  const [descriptionFilter, setDescriptionFilter] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<{ name?: string; description?: string; price?: number | '' }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    async function fetchProducts() {
      setLoading(true)
      setFetchError(null)
      try {
        const resp = await searchProducts({ page, pagesize: pageSize, name: nameFilter, description: descriptionFilter })
        if (!mounted) return
        setProducts(resp.content || [])
        setTotalPages(resp.totalPages ?? 0)
        setTotalElements(resp.totalElements ?? (resp.content ? resp.content.length : 0))
      } catch (err: any) {
        if (!mounted) return
        setFetchError(err.message || 'Error al obtener productos')
        setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProducts()
    return () => { mounted = false }
  }, [page, pageSize, nameFilter, descriptionFilter])

  function goTo(p: number) {
    if (p < 0) p = 0
    if (totalPages && p >= totalPages) p = totalPages - 1
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ paddingTop: '2rem' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h4 mb-0">Administrar productos</h1>
            <div className="text-muted small">Listado administrativo — Página {page + 1}{totalPages ? ` de ${totalPages}` : ''}</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">Filas</label>
            <select className="form-select form-select-sm" style={{ width: 'auto' }} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* filtros */}
        <form className="row g-2 align-items-center mb-3" onSubmit={e => { e.preventDefault(); setPage(0) }}>
          <div className="col-auto">
            <input className="form-control form-control-sm" placeholder="Buscar por nombre" value={nameFilter} onChange={e => setNameFilter(e.target.value)} />
          </div>
          <div className="col-auto">
            <input className="form-control form-control-sm" placeholder="Buscar por descripción" value={descriptionFilter} onChange={e => setDescriptionFilter(e.target.value)} />
          </div>
          <div className="col-auto">
            <button className="btn btn-sm btn-primary" type="submit">Buscar</button>
          </div>
          <div className="col-auto">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setNameFilter(''); setDescriptionFilter(''); setPage(0) }}>Limpiar</button>
          </div>
          <div className="col-auto ms-auto">
            <button className="btn btn-sm btn-outline-secondary" onClick={onBack} type="button">Volver</button>
          </div>
        </form>

        {loading && (
          <div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div></div>
        )}

        {fetchError && (
          <div className="alert alert-danger" role="alert">{fetchError}</div>
        )}

        {!loading && !fetchError && (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th style={{width: '6%'}}>ID</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th style={{width: '12%'}}>Precio</th>
                  <th style={{width: '14%'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const isEditing = editingId === p.id
                  return (
                    <tr key={p.id}>
                      <td className="text-muted">{p.id}</td>
                      <td style={{minWidth: 200}}>
                        {isEditing ? (
                          <input className="form-control form-control-sm" value={editValues.name ?? ''} onChange={e => setEditValues(ev => ({ ...ev, name: e.target.value }))} />
                        ) : (
                          p.name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input className="form-control form-control-sm" value={editValues.description ?? ''} onChange={e => setEditValues(ev => ({ ...ev, description: e.target.value }))} />
                        ) : (
                          <div style={{maxWidth: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.description}</div>
                        )}
                      </td>
                      <td className="text-end">
                        {isEditing ? (
                          <input type="number" step="0.01" min="0" className="form-control form-control-sm text-end" value={editValues.price === '' ? '' : (editValues.price ?? p.price ?? 0)} onChange={e => setEditValues(ev => ({ ...ev, price: e.target.value === '' ? '' : Number(e.target.value) }))} />
                        ) : (
                          <div className="fw-semibold">${p.price?.toFixed(2)}</div>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-primary" disabled={saving} onClick={async () => {
                              // Guardar cambios
                              setSaving(true)
                              try {
                                const payload: any = {
                                  name: (editValues.name ?? p.name) as string,
                                  description: (editValues.description ?? p.description) as string,
                                }
                                if (editValues.price === '') payload.price = null
                                else if (editValues.price !== undefined) payload.price = editValues.price

                                const updated = await updateProduct(p.id, payload)
                                if (updated == null) {
                                  // backend indicates conflict or not found
                                  window.alert('No se pudo actualizar: nombre posiblemente duplicado o producto no existe')
                                } else {
                                  // actualizar lista localmente
                                  setProducts(prev => prev.map(x => x.id === p.id ? { ...x, name: updated.name, description: updated.description, price: updated.price, mainImageUrl: updated.mainImageUrl } : x))
                                  setEditingId(null)
                                }
                              } catch (err: any) {
                                window.alert(err?.message || 'Error actualizando producto')
                              } finally {
                                setSaving(false)
                              }
                            }}>Guardar</button>
                            <button className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={() => { setEditingId(null); setEditValues({}) }}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditingId(p.id); setEditValues({ name: p.name, description: p.description ?? '', price: p.price ?? '' }) }}>Editar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* paginación */}
        <nav className="d-flex justify-content-center align-items-center mt-3" aria-label="Paginación de productos">
          <ul className="pagination mb-0">
            <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goTo(page - 1)} aria-label="Anterior">&laquo;</button>
            </li>

            {Array.from({ length: Math.max(1, totalPages || 1) }).map((_, i) => {
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

