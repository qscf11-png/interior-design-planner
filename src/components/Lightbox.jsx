import { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react'
import FavoriteButton from './FavoriteButton'

// 全螢幕圖片燈箱
// 手機：雙指縮放 (pinch)、單指拖曳平移、單指輕點切換 1x/2.5x
// 桌機：滾輪縮放、點圖切換、拖曳平移、+/- 按鈕
// canFavorite=true 時顯示收藏按鈕（存到 localStorage，可選歸屬看房物件）
export default function Lightbox({ src, alt = '', onClose, canFavorite = false }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const pointers = useRef(new Map())  // pointerId -> { x, y }
  const pinch = useRef(null)          // { dist, zoom }
  const tap = useRef(null)            // { moved }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const clampZoom = (z) => Math.max(1, Math.min(4, z))
  const apply = (z) => { const c = clampZoom(z); setZoom(c); if (c === 1) setPan({ x: 0, y: 0 }) }
  const toggleZoom = () => { if (zoom > 1) apply(1); else setZoom(2.5) }

  const dist2 = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) { pinch.current = { dist: dist2(), zoom }; tap.current = null }
    else if (pointers.current.size === 1) { tap.current = { moved: false } }
  }
  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    if (pointers.current.size === 2 && pinch.current) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      apply(pinch.current.zoom * (dist2() / (pinch.current.dist || 1)))
      return
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { if (tap.current) tap.current.moved = true }
    if (zoom > 1) setPan(p => ({ x: p.x + dx, y: p.y + dy }))
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0 && tap.current && !tap.current.moved) toggleZoom()
    if (pointers.current.size === 0) tap.current = null
  }
  const onWheel = (e) => apply(zoom - e.deltaY * 0.002)

  const btnStyle = {
    width: 42, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(20,20,28,0.6)', backdropFilter: 'blur(10px)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  }

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

      <img src={src} alt={alt} draggable={false}
        onWheel={onWheel}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        style={{
          maxWidth: '96vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 8,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: pointers.current.size ? 'none' : 'transform 0.2s ease',
          cursor: zoom > 1 ? 'grab' : 'zoom-in', userSelect: 'none', touchAction: 'none',
        }} />

      {/* 關閉 */}
      <button onClick={onClose} title="關閉（Esc）"
        style={{ ...btnStyle, position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 16 }}>
        <X size={20} />
      </button>

      {/* 收藏（含歸屬物件選單） */}
      {canFavorite && (
        <div style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 68, zIndex: 5 }}>
          <FavoriteButton img={src} title={alt} variant="dark" />
        </div>
      )}

      {/* 縮放控制列 */}
      <div style={{ position: 'absolute', bottom: 'max(18px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => apply(zoom - 0.5)} title="縮小" style={btnStyle}><ZoomOut size={18} /></button>
        <span style={{ minWidth: 52, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(20,20,28,0.6)', backdropFilter: 'blur(10px)', padding: '8px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => apply(zoom + 0.5)} title="放大" style={btnStyle}><ZoomIn size={18} /></button>
        <a href={src} download={`${alt || 'design'}.png`} title="下載原圖" onClick={e => e.stopPropagation()} style={{ ...btnStyle, textDecoration: 'none' }}>
          <Download size={18} />
        </a>
      </div>

      {/* 操作提示 */}
      <div style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', left: 16, fontSize: 12, color: 'rgba(255,255,255,0.7)', padding: '8px 12px', borderRadius: 10, background: 'rgba(20,20,28,0.5)', backdropFilter: 'blur(8px)' }}>
        雙指縮放 · 拖曳移動 · 輕點放大
      </div>
    </div>
  )
}
