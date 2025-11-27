import { useState } from 'react'
import { uploadProductImage } from '../services/api'

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

  async function doUpload() {
    if (!file) {
      setError('Seleccione un archivo antes de subir')
      return
    }
    setUploading(true)
    setError(null)
    try {
      await uploadProductImage(productId, file, true)
      if (onUploaded) onUploaded()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error subiendo imagen')
    } finally {
      setUploading(false)
    }
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
              <div className="mb-2 small text-muted">Producto</div>
              <div className="mb-3"><strong>{productName} (ID {productId})</strong></div>

              <div className="mb-2">
                <label className="form-label small">Archivo</label>
                <input type="file" accept="image/*" className="form-control form-control-sm" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
              </div>

              {file && (
                <div className="mb-2 small text-muted">Archivo seleccionado: <strong>{file.name}</strong></div>
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
