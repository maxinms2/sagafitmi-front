import { useEffect, useState } from 'react'

type Item = { id: string; type: 'success' | 'info' | 'warning' | 'danger'; message: string; title?: string }

export default function Notifications() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail || {}
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const item: Item = { id, type: d.type || 'info', message: d.message || '', title: d.title }
      setItems((s) => [item, ...s])
      const duration = typeof d.duration === 'number' ? d.duration : 4000
      setTimeout(() => {
        setItems((s) => s.filter((x) => x.id !== id))
      }, duration)
    }

    window.addEventListener('app-notification', handler)
    return () => window.removeEventListener('app-notification', handler)
  }, [])

  if (!items.length) return null

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, minWidth: 320 }}>
      {items.map((n) => (
        <div key={n.id} className={`alert alert-${n.type === 'info' ? 'primary' : n.type} alert-dismissible fade show`} role="alert">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {n.title && <strong className="me-1">{n.title}</strong>}
              <div>{n.message}</div>
            </div>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setItems((s) => s.filter((x) => x.id !== n.id))} />
          </div>
        </div>
      ))}
    </div>
  )
}
