import { useEffect, useState } from 'react'
import { searchProducts, updateProduct, deleteProduct, createProduct } from '../services/api'
import { notifyError, notifyWarning } from '../utils/notify'
import ProductImageUploadModal from '../components/ProductImageUploadModal'
import { formatCurrency } from '../utils/format'
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProduct, setNewProduct] = useState<{ name: string; description: string; price: number | '' }>({ name: '', description: '', price: '' })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [productForUpload, setProductForUpload] = useState<Product | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  function extractError(err: any) {
    const raw = err?.message || String(err || '')
    const parsed = raw.replace(/^\d+\s*/, '')
    return { raw, parsed }
  }

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
        const { raw, parsed } = extractError(err)
        setFetchError(parsed || raw)
        setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProducts()
    return () => { mounted = false }
  }, [page, pageSize, nameFilter, descriptionFilter, reloadKey])

  function goTo(p: number) {
    if (p < 0) p = 0
    if (totalPages && p >= totalPages) p = totalPages - 1
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeDelete() {
    setShowDeleteDialog(false)
    setProductToDelete(null)
  }

  async function confirmDelete() {
    if (!productToDelete) return
    setDeleting(true)
    try {
      await deleteProduct(productToDelete.id)
      setProducts(prev => prev.filter(x => x.id !== productToDelete.id))
      setTotalElements(prev => Math.max(0, prev - 1))
      setShowDeleteDialog(false)
      setProductToDelete(null)
    } catch (err: any) {
      const { raw, parsed } = extractError(err)
      // Cerrar la modal y limpiar la selección antes de notificar
      setShowDeleteDialog(false)
      setProductToDelete(null)
      // Mostrar mensaje específico cuando el backend responde 403 Request failed
      if (raw.includes('403') && raw.includes('Request failed')) {
        notifyWarning('Error al eliminar, existen órdenes o items de carrito relacionadas')
      } else {
        notifyError(parsed || raw)
      }
    } finally {
      setDeleting(false)
    }
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
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setNameFilter(''); setDescriptionFilter(''); setPage(0) }}>Limpiar</button>
          </div>
          <div className="col-auto ms-auto">
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-success" type="button" onClick={() => setShowCreateDialog(true)}>Nuevo producto</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={onBack} type="button">Volver</button>
            </div>
          </div>
        </form>

        {loading && (
          <div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div></div>

        )}

        {showDeleteDialog && (
          <>
            <div className="modal-backdrop show"></div>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
              <div className="modal-dialog modal-sm modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Confirmar borrado</h5>
                    <button type="button" className="btn-close" aria-label="Cerrar" onClick={closeDelete}></button>
                  </div>
                  <div className="modal-body">
                    <p>¿Eliminar el producto <strong>{productToDelete?.name}</strong> (ID {productToDelete?.id})?</p>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-sm btn-outline-secondary" onClick={closeDelete} disabled={deleting}>Cancelar</button>
                    <button className="btn btn-sm btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showCreateDialog && (
          <>
            <div className="modal-backdrop show"></div>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
              <div className="modal-dialog modal-sm modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Crear producto</h5>
                    <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setShowCreateDialog(false)} disabled={creating}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-2">
                      <label className="form-label small">Nombre</label>
                      <input className="form-control form-control-sm" value={newProduct.name} onChange={e => setNewProduct(n => ({ ...n, name: e.target.value }))} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">Descripción</label>
                      <textarea className="form-control form-control-sm" rows={3} value={newProduct.description} onChange={e => setNewProduct(n => ({ ...n, description: e.target.value }))} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">Precio</label>
                      <input type="number" step="0.01" min="0" className="form-control form-control-sm" value={newProduct.price === '' ? '' : newProduct.price} onChange={e => setNewProduct(n => ({ ...n, price: e.target.value === '' ? '' : Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowCreateDialog(false)} disabled={creating}>Cancelar</button>
                    <button className="btn btn-sm btn-primary" onClick={async () => {
                      // Crear producto
                      if (!newProduct.name || newProduct.name.trim() === '') { notifyWarning('El nombre es requerido'); return }
                      if (newProduct.price === '' || isNaN(Number(newProduct.price))) { notifyWarning('Precio inválido'); return }
                      if (Number(newProduct.price) <= 0) { notifyWarning('El precio debe ser mayor que 0'); return }
                      setCreating(true)
                      try {
                        const created = await createProduct({ name: newProduct.name.trim(), description: newProduct.description.trim(), price: Number(newProduct.price) })
                        // Añadir a la lista local y cerrar modal
                        setProducts(prev => [created, ...prev])
                        setTotalElements(prev => prev + 1)
                        setShowCreateDialog(false)
                        setNewProduct({ name: '', description: '', price: '' })
                        } catch (err: any) {
                          const { raw, parsed } = extractError(err)
                          // Primero limpiar la modal y luego cerrarla, según petición de UX
                          setNewProduct({ name: '', description: '', price: '' })
                          setShowCreateDialog(false)
                          notifyError(parsed || raw)
                      } finally {
                        setCreating(false)
                      }
                    }} disabled={creating}>{creating ? 'Creando...' : 'Crear'}</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showUploadModal && productForUpload && (
          <ProductImageUploadModal
            productId={productForUpload.id}
            productName={productForUpload.name}
            onClose={() => { setShowUploadModal(false); setProductForUpload(null) }}
            onUploaded={() => { setReloadKey(k => k + 1) }}
          />
        )}

        {fetchError && (
          <div className="alert alert-danger" role="alert">{fetchError}</div>
        )}

        {!loading && !fetchError && (
          <div className="table-responsive">
            <table className="table table-sm table-hover table-striped align-middle">
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
                          <div className="fw-semibold">{formatCurrency(p.price)}</div>
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
                                  notifyWarning('No se pudo actualizar: nombre posiblemente duplicado o producto no existe')
                                } else {
                                  // actualizar lista localmente
                                  setProducts(prev => prev.map(x => x.id === p.id ? { ...x, name: updated.name, description: updated.description, price: updated.price, mainImageUrl: updated.mainImageUrl } : x))
                                  setEditingId(null)
                                }
                              } catch (err: any) {
                                const { raw, parsed } = extractError(err)
                                notifyError(parsed || raw)
                              } finally {
                                setSaving(false)
                              }
                            }}>Guardar</button>
                            <button className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={() => { setEditingId(null); setEditValues({}) }}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditingId(p.id); setEditValues({ name: p.name, description: p.description ?? '', price: p.price ?? '' }) }} title="Editar" aria-label="Editar">Editar</button>

                            <button className="btn btn-sm btn-outline-secondary" title="Subir imagen" onClick={() => { setProductForUpload(p); setShowUploadModal(true) }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                                <path d="M.5 9.9a.5.5 0 0 1 .5-.4h3.793l1-1H1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-4.793l1 1H14a.5.5 0 0 1 .5.4V13a2 2 0 0 1-2 2H2.5A2.5 2.5 0 0 1 .5 12.5v-2.6z"/>
                                <path d="M7.646 1.146a.5.5 0 0 1 .708 0L10 2.793V8.5a.5.5 0 0 1-1 0V3.707L7.854 2.561 7.646 2.354 6 1.5l1.646-.354z"/>
                              </svg>
                            </button>

                            <button className="btn btn-sm btn-outline-danger" title="Borrar" onClick={() => { setProductToDelete(p); setShowDeleteDialog(true) }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                                <path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-7z"/>
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H5.5l.5-1h4l.5 1H13.5a1 1 0 0 1 1 1zM6.118 4 5.5 5h5l-.618-1H6.118z"/>
                              </svg>
                            </button>
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

