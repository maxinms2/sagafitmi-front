import { useState, useEffect } from 'react'
import { uploadProductImage, getProductImages, deleteProductImage, API_BASE, assignMainImage } from '../services/api'
import { notifySuccess, notifyError } from '../utils/notify'
import type { ProductImageDTO } from '../services/api'

const PLACEHOLDER = 'https://via.placeholder.com/400x300?text=No+image'

type Props = {
  productId: number
  productName: string
  onClose: () => void
  onUploaded?: () => void
}

export default function ProductImageUploadModal({ productId, productName, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<ProductImageDTO[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [current, setCurrent] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteImageDialog, setShowDeleteImageDialog] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ProductImageDTO | null>(null)
  const [settingMainId, setSettingMainId] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoadingImages(true)
      try {
        const imgs = await getProductImages(productId)
        if (!mounted) return
        setImages(imgs || [])
        setCurrent(0)
      } catch (e: any) {
        // no bloqueante: mostramos mensaje en UI
        setError(e?.message || 'Error cargando imágenes del producto')
      } finally {
        if (mounted) setLoadingImages(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [productId])

  async function doUpload() {
    if (!file) {
      setError('Seleccione un archivo antes de subir')
      return
    }
    setUploading(true)
    setError(null)
    try {
      await uploadProductImage(productId, file, true)
      // Después de subir, recargamos las imágenes y añadimos la nueva al carrusel
      try {
        const imgs = await getProductImages(productId)
        setImages(imgs || [])
        // Si hay imágenes, seleccionar la última subida preferentemente la que tiene mainImage
        if (imgs && imgs.length > 0) {
          const mainIndex = imgs.findIndex(i => i.mainImage)
          if (mainIndex >= 0) setCurrent(mainIndex)
          else setCurrent(imgs.length - 1)
        }
      } catch (e: any) {
        // no bloquear la modal si falla la recarga
        setError(e?.message || 'Subida completada, pero no se pudo actualizar la lista de imágenes')
      }
      // limpiar selección de archivo para permitir subir otro sin cerrar
      setFile(null)
      if (onUploaded) onUploaded()
    } catch (err: any) {
      setError(err?.message || 'Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  // abrir modal de confirmación para borrar imagen
  function handleDeleteImageRequest(img: ProductImageDTO) {
    setImageToDelete(img)
    setShowDeleteImageDialog(true)
  }

  function closeDeleteImage() {
    setShowDeleteImageDialog(false)
    setImageToDelete(null)
  }

  async function confirmDeleteImage() {
    if (!imageToDelete) return
    setDeletingId(imageToDelete.id)
    try {
      await deleteProductImage(productId, imageToDelete.id)
      // actualizar lista localmente
      setImages(prev => {
        const next = prev.filter(x => x.id !== imageToDelete.id)
        // ajustar índice actual
        if (next.length === 0) {
          setCurrent(0)
        } else if (current >= next.length) {
          setCurrent(next.length - 1)
        }
        return next
      })
      setShowDeleteImageDialog(false)
      setImageToDelete(null)
      notifySuccess('Imagen eliminada correctamente')
    } catch (err: any) {
      notifyError(err?.message || 'Error al eliminar imagen')
      // mantener modal abierta para reintentar? cerramos para mantener consistencia con otros flujos
      setShowDeleteImageDialog(false)
      setImageToDelete(null)
    } finally {
      setDeletingId(null)
    }
  }

  function resolveUrl(url: string) {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('/')) return `${API_BASE}${url}`
    return `${API_BASE}/${url}`
  }

  return (
    <>
      <div className="modal-backdrop show"></div>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Subir imagen</h5>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} disabled={uploading}></button>
            </div>
            <div className="modal-body">
              <div className="mb-1"><strong>{productName} (ID {productId})</strong></div>

              {/* Carousel de imágenes existentes */}
              <div className="mb-1">
                {loadingImages ? (
                  <div className="text-center py-2 small text-muted">Cargando imágenes...</div>
                ) : images.length === 0 ? (
                  <div className="text-center py-2 small text-muted">No hay imágenes aún.</div>
                ) : (
                  <div>
                    <div className="d-flex align-items-center justify-content-center mb-2" style={{ height: 160 }}>
                      <button className="btn btn-sm btn-outline-secondary me-2" type="button" onClick={() => setCurrent(i => (i - 1 + images.length) % images.length)} aria-label="Anterior">◀</button>
                      <div style={{ width: '100%', maxWidth: 420, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f8f9fa', borderRadius: 6 }}>
                        <img src={resolveUrl(images[current].url)} alt={`Imagen ${current + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} onError={(e: any) => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER }} />
                      </div>
                      <button className="btn btn-sm btn-outline-secondary ms-2" type="button" onClick={() => setCurrent(i => (i + 1) % images.length)} aria-label="Siguiente">▶</button>
                    </div>
                    <div className="d-flex gap-2 justify-content-center" style={{ overflowX: 'auto' }}>
                      {images.map((img, idx) => (
                        <div key={img.id} style={{ position: 'relative', display: 'inline-block' }}>
                          <button type="button" className={`p-0 border ${idx === current ? 'border-primary' : 'border-1'}`} onClick={() => setCurrent(idx)} style={{ background: 'transparent' }}>
                            <img src={resolveUrl(img.url)} alt={`thumb-${idx}`} style={{ width: 64, height: 48, objectFit: 'cover', display: 'block' }} onError={(e: any) => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER }} />
                          </button>
                          <div style={{ position: 'absolute', top: 4, left: 4 }}>
                            <input
                              type="checkbox"
                              title={img.mainImage ? 'Imagen principal' : 'Marcar como principal'}
                              checked={img.mainImage}
                              onChange={async () => {
                                  if (img.mainImage) return
                                  setSettingMainId(img.id)
                                  try {
                                    // solicitar al backend que asigne la imagen como principal
                                    await assignMainImage(productId, img.id)
                                    // recargar la lista completa de imágenes para evitar perder miniaturas
                                    const newImgs = await getProductImages(productId)
                                    setImages(newImgs || [])
                                    const mainIndex = newImgs.findIndex(i => i.mainImage)
                                    if (mainIndex >= 0) setCurrent(mainIndex)
                                    else {
                                      const idx2 = newImgs.findIndex(i => i.id === img.id)
                                      if (idx2 >= 0) setCurrent(idx2)
                                    }
                                    notifySuccess('Imagen principal actualizada')
                                  } catch (e: any) {
                                    notifyError(e?.message || 'Error al marcar imagen como principal')
                                  } finally {
                                    setSettingMainId(null)
                                  }
                                }}
                                disabled={settingMainId === img.id}
                              style={{ width: 16, height: 16, accentColor: '#0d6efd', background: 'white' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteImageRequest(img)}
                            disabled={deletingId === img.id}
                            title="Eliminar imagen"
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              padding: 2,
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              border: 'none',
                              background: 'rgba(255,255,255,0.85)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                              <path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-7z"/>
                              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H5.5l.5-1h4l.5 1H13.5a1 1 0 0 1 1 1zM6.118 4 5.5 5h5l-.618-1H6.118z"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmación de borrado de imagen (modal) */}
              {showDeleteImageDialog && imageToDelete && (
                <>
                  <div className="modal-backdrop show"></div>
                  <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-sm modal-dialog-centered">
                      <div className="modal-content">
                        <div className="modal-header">
                          <h5 className="modal-title">Confirmar borrado</h5>
                          <button type="button" className="btn-close" aria-label="Cerrar" onClick={closeDeleteImage}></button>
                        </div>
                        <div className="modal-body">
                          <p>¿Eliminar la imagen <strong>#{imageToDelete.id}</strong> del producto <strong>{productName}</strong> (ID {productId})?</p>
                        </div>
                        <div className="modal-footer">
                          <button className="btn btn-sm btn-outline-secondary" onClick={closeDeleteImage} disabled={deletingId === imageToDelete.id}>Cancelar</button>
                          <button className="btn btn-sm btn-danger" onClick={confirmDeleteImage} disabled={deletingId === imageToDelete.id}>{deletingId === imageToDelete.id ? 'Eliminando...' : 'Eliminar'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mb-1">
                <label className="form-label small">Archivo</label>
                <input type="file" accept="image/*" className="form-control form-control-sm" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
              </div>

              {file && (
                <div className="mb-1 small text-muted">Archivo seleccionado: <strong>{file.name}</strong></div>
              )}

              {error && (
                <div className="alert alert-danger small" role="alert">{error}</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm btn-outline-secondary" onClick={onClose} disabled={uploading}>Cancelar</button>
              <button className="btn btn-sm btn-primary" onClick={doUpload} disabled={uploading}>{uploading ? 'Subiendo...' : 'Subir imagen'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
