import { useEffect, useState } from 'react'
import { getOrders } from '../services/api'
import type { OrderDTO } from '../services/api'

interface Props {
  open: boolean
  onClose: () => void
}

export default function OrdersModal({ open, onClose }: Props) {
  const [orders, setOrders] = useState<OrderDTO[]>([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    if (!open) return
    let mounted = true

    async function fetchOrders() {
      setLoading(true)
      setFetchError(null)
      try {
        const resp = await getOrders({ page, size: pageSize, startDate: startDate || undefined, endDate: endDate || undefined, status: statusFilter || undefined })
        if (!mounted) return
        setOrders(resp.content || [])
        setTotalPages(resp.totalPages ?? 0)
        setTotalElements(resp.totalElements ?? (resp.content ? resp.content.length : 0))
      } catch (err: any) {
        if (!mounted) return
        setFetchError(err.message || 'Error al obtener órdenes')
        setOrders([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchOrders()
    return () => { mounted = false }
  }, [open, page, pageSize, startDate, endDate, statusFilter])

  function goTo(p: number) {
    if (p < 0) p = 0
    if (totalPages && p >= totalPages) p = totalPages - 1
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!open) return null

  return (
    <>
      <div className="modal-backdrop show"></div>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '95%' }}>
          <div className="modal-content">
            <div className="modal-body p-0">
              <div className="bg-light" style={{ minHeight: '60vh' }}>
                <main className="container" style={{ paddingTop: '1rem' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <h1 className="h4 mb-0">Administrar órdenes</h1>
                      <div className="text-muted small">Listado administrativo — Página {page + 1}{totalPages ? ` de ${totalPages}` : ''}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <label className="small text-muted mb-0">Filas</label>
                      <select className="form-select form-select-sm" style={{ width: 'auto' }} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                    </div>
                  </div>

                  <form className="row g-2 align-items-center mb-3" onSubmit={e => { e.preventDefault(); setPage(0) }}>
                    <div className="col-auto">
                      <input type="date" className="form-control form-control-sm" placeholder="Fecha inicio" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="col-auto">
                      <input type="date" className="form-control form-control-sm" placeholder="Fecha fin" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div className="col-auto">
                      <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">Todos los estados</option>
                        <option value="NEW">NEW</option>
                        <option value="PAID">PAID</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                    <div className="col-auto">
                      <button className="btn btn-sm btn-primary" type="submit">Buscar</button>
                    </div>
                    <div className="col-auto">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); setPage(0) }}>Limpiar</button>
                    </div>
                    <div className="col-auto ms-auto">
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Volver</button>
                      </div>
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
                            <th style={{ width: '6%' }}>ID</th>
                            <th>Usuario</th>
                            <th style={{ width: '12%' }}>Total</th>
                            <th style={{ width: '12%' }}>Estado</th>
                            <th>Creado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id}>
                              <td className="text-muted">{o.id}</td>
                              <td>{o.userId}</td>
                              <td className="text-end">${o.total?.toFixed?.(2)}</td>
                              <td>{o.status}</td>
                              <td>{new Date(o.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* paginación */}
                  <nav className="d-flex justify-content-center align-items-center mt-3" aria-label="Paginación de órdenes">
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

                  <div className="text-center text-muted small mt-2">{totalElements} órdenes</div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
