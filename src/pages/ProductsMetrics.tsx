import { useState, useEffect } from 'react'
import { postMetricsProducts } from '../services/api'
import type { MetricsProductItem } from '../services/api'

type Props = { onBack?: () => void }

export default function ProductsMetrics({ onBack }: Props) {
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
  const [sortBy, setSortBy] = useState<'quantity' | 'amount' | string>('quantity')
  const [items, setItems] = useState<MetricsProductItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [top, setTop] = useState<number | undefined>(10)

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault()
    // debug
    // eslint-disable-next-line no-console
    console.log('[ProductsMetrics] doSearch called', { startDate, endDate, sortBy, top })
    if (endDate < startDate) {
      setError('La fecha final no puede ser anterior a la fecha inicial.')
      return
    }
    if (typeof top === 'number' && (!Number.isFinite(top) || top <= 0)) {
      setError('El valor de "top" debe ser un número entero mayor que 0.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resp = await postMetricsProducts({ startDate, endDate, sortBy, top })
      // El backend puede devolver directamente un array, o un objeto con la propiedad `items`.
      // Normalizamos a un array para evitar `items.map is not a function` cuando la respuesta
      // no es un array (p. ej. { items: [...] }).
      const list = Array.isArray(resp) ? resp : (resp && (resp as any).items ? (resp as any).items : [])
      setItems(list)
    } catch (err: any) {
      setError(err?.message || 'Error al obtener métricas')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Ejecutar búsqueda inicial al montar la página con los parámetros por defecto
  useEffect(() => {
    // no pasamos evento; doSearch manejará validaciones y actualización de estado
    void doSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formatAmount(n?: number) {
    if (n === undefined || n === null || Number.isNaN(n)) return '-'
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  }

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ paddingTop: '2rem' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h4 mb-0">Métricas — Productos</h1>
            <div className="text-muted small">Reporte de ventas por producto</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {onBack ? <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>Volver</button> : null}
          </div>
        </div>

        <form className="row g-2 align-items-center mb-3" onSubmit={doSearch}>
          <div className="col-auto">
            <div>
              <label className="form-label small">Fecha inicial</label>
              <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="col-auto">
            <div>
              <label className="form-label small">Fecha final</label>
              <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="col-auto">
            <select className="form-select form-select-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="quantity">Ordenar por cantidad</option>
              <option value="amount">Ordenar por monto</option>
            </select>
          </div>
          <div className="col-auto">
            <div className="input-group input-group-sm">
              <span className="input-group-text">Top:</span>
              <input
                type="number"
                className="form-control form-control-sm"
                aria-label="Top"
                value={top ?? ''}
                min={1}
                style={{ width: 100 }}
                onChange={e => {
                  const v = e.target.value
                  if (v === '') setTop(undefined)
                  else setTop(Number.parseInt(v, 10))
                }}
              />
            </div>
          </div>
          <div className="col-auto">
            <div className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
              Encontrados: <span className="fw-semibold">{items.length}</span>
            </div>
          </div>
          <div className="col" />
          <div className="col-auto">
            <button className="btn btn-sm btn-primary" type="submit" disabled={loading || endDate < startDate} onClick={() => doSearch()}>
              Buscar
            </button>
          </div>
        </form>

        {endDate < startDate && (
          <div className="row mb-3"><div className="col-12"><div className="text-danger small">La fecha final no puede ser anterior a la fecha inicial.</div></div></div>
        )}

        {loading && (
          <div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div></div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* inline count is shown in the form row; removed large card to keep UI compact */}

            <div className="table-responsive">
              <table className="table table-sm table-hover table-striped align-middle">
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>ID</th>
                    <th>Producto</th>
                    <th>Descripción</th>
                    <th style={{ width: '12%' }} className="text-end">Cantidad vendida</th>
                    <th style={{ width: '12%' }} className="text-end">Monto vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.productId}>
                      <td className="text-muted">{it.productId}</td>
                      <td style={{ minWidth: 200 }}>{it.name}</td>
                      <td style={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.description}</td>
                      <td className="text-end">{it.quantitySold}</td>
                      <td className="text-end fw-semibold">${formatAmount(it.amountSold)}</td>
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
