import { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react'

// 全螢幕圖片燈箱：點圖切換 1x/2.5x、放大後可拖曳平移、滾輪/按鈕縮放、Esc 關閉
export default function Lightbox({ src, alt = '', onClose }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef(null)
  const moved = useRef(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const clampZoom = (z) => Math.max(1, Math.min(4, z))
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const toggleZoom = () => {
    if (moved.current) return  // 拖曳後放開不觸發切換
    if (zoom > 1) reset()
    else setZoom(2.5)
  }

  const onWheel = (e) => {
    const next = clampZoom(zoom - e.deltaY * 0.002)
    setZoom(next)
    if (next === 1) setPan({ x: 0, y: 0 })
  }

  const onPointerDown = (e) => {
    if (zoom <= 1) return
    moved.current = false
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true
    setPan({ x: drag.current.px + dx, y: drag.current.py + dy })
  }
  const onPointerUp = () => { drag.current = null }

  const btnStyle = {
    width: 42, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(20,20,28,0.6)', backdropFilter: 'blur(10px)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  }

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', overflow: 'hidden' }}>

      <img src={src} alt={alt} draggable={false}
        onClick={toggleZoom}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          maxWidth: '94vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: drag.current ? 'none' : 'transform 0.2s ease',
          cursor: zoom > 1 ? 'grab' : 'zoom-in', userSelect: 'none',
        }} />

      {/* 關閉 */}
      <button onClick={onClose} title="關閉（Esc）"
        style={{ ...btnStyle, position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 16 }}>
        <X size={20} />
      </button>

      {/* 縮放控制列 */}
      <div style={{ position: 'absolute', bottom: 'max(18px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => { const z = clampZoom(zoom - 0.5); setZoom(z); if (z === 1) setPan({ x: 0, y: 0 }) }} title="縮小" style={btnStyle}>
          <ZoomOut size={18} />
        </button>
        <span style={{ minWidth: 52, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(20,20,28,0.6)', backdropFilter: 'blur(10px)', padding: '8px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => clampZoom(z + 0.5))} title="放大" style={btnStyle}>
          <ZoomIn size={18} />
        </button>
        <a href={src} download={`${alt || 'design'}.png`} title="下載原圖" onClick={e => e.stopPropagation()} style={{ ...btnStyle, textDecoration: 'none' }}>
          <Download size={18} />
        </a>
      </div>

      {/* 操作提示 */}
      <div style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', left: 16, fontSize: 12, color: 'rgba(255,255,255,0.7)', padding: '8px 12px', borderRadius: 10, background: 'rgba(20,20,28,0.5)', backdropFilter: 'blur(8px)' }}>
        點圖放大 · 拖曳移動 · 滾輪縮放
      </div>
    </div>
  )
}
