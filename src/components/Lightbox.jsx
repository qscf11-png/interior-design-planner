import { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Download, Star } from 'lucide-react'
import { getProperties, addFavorite, deleteFavorite, findFavoriteByImg } from '../lib/db'

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

  // 收藏狀態
  const [favId, setFavId] = useState(() => (canFavorite ? findFavoriteByImg(src)?.id : null) || null)
  const [picker, setPicker] = useState(false)
  const [favErr, setFavErr] = useState(null)
  const properties = useRef(canFavorite ? getProperties() : []).current

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

  // ─── 收藏 ───
  const saveFav = (propertyId) => {
    try {
      const f = addFavorite({ img: src, title: alt || '設計圖', propertyId: propertyId || null })
      setFavId(f.id); setPicker(false); setFavErr(null)
    } catch (e) { setFavErr(e.message); setPicker(false) }
  }
  const onStarClick = () => {
    if (favId) { deleteFavorite(favId); setFavId(null); return }
    if (properties.length) setPicker(p => !p)   // 有物件 → 選歸屬
    else saveFav(null)                          // 無物件 → 直接存未分類
  }

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
        <div style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 68 }}>
          <button onClick={onStarClick} title={favId ? '取消收藏' : '收藏'}
            style={{ ...btnStyle, background: favId ? 'rgba(212,168,83,0.9)' : 'rgba(20,20,28,0.6)' }}>
            <Star size={20} fill={favId ? '#fff' : 'none'} color="#fff" />
          </button>
          {picker && (
            <div style={{ position: 'absolute', top: 50, right: 0, width: 200, background: 'rgba(28,28,36,0.96)', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>收藏到哪個物件？</div>
              <button onClick={() => saveFav(null)} style={pickerItem}>📦 未分類收藏</button>
              {properties.map(p => (
                <button key={p.id} onClick={() => saveFav(p.id)} style={pickerItem}>🏠 {p.name || '未命名物件'}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {favErr && (
        <div style={{ position: 'absolute', top: 'max(64px, calc(env(safe-area-inset-top) + 50px))', right: 16, maxWidth: 240, fontSize: 12, color: '#fff', background: 'rgba(208,64,64,0.92)', padding: '8px 12px', borderRadius: 10 }}>
          ⚠️ {favErr}
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

const pickerItem = {
  display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
  fontSize: 13, color: '#fff', background: 'transparent', border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
}
