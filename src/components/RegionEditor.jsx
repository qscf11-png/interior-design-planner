import { useState, useRef } from 'react'
import { X, Plus, Trash2, Check, MousePointerClick } from 'lucide-react'

const PALETTE = ['#d4a853', '#8b7cf6', '#5cba9d', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa', '#34d399', '#fb923c']
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// 手動調整房間分區：拖曳移動、右下角縮放、新增/刪除/改名
export default function RegionEditor({ image, rooms, onSave, onClose }) {
  const [list, setList] = useState(() => rooms.map(r => ({ ...r, bbox: Array.isArray(r.bbox) ? [...r.bbox] : null })))
  const [sel, setSel] = useState(-1)
  const boxRef = useRef()
  const drag = useRef(null)

  const placed = list.filter(r => r.bbox)
  const unplaced = list.filter(r => !r.bbox)

  const toPct = (e) => {
    const r = boxRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }

  const startDrag = (e, idx, mode) => {
    e.stopPropagation(); e.preventDefault()
    setSel(idx)
    drag.current = { idx, mode, start: toPct(e), bbox: [...list[idx].bbox] }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onDragMove = (e) => {
    const d = drag.current
    if (!d) return
    const p = toPct(e)
    const dx = p.x - d.start.x, dy = p.y - d.start.y
    setList(l => l.map((r, i) => {
      if (i !== d.idx) return r
      let [x, y, w, h] = d.bbox
      if (d.mode === 'move') {
        x = clamp(x + dx, 0, 100 - w); y = clamp(y + dy, 0, 100 - h)
      } else {
        w = clamp(w + dx, 5, 100 - x); h = clamp(h + dy, 5, 100 - y)
      }
      return { ...r, bbox: [x, y, w, h] }
    }))
  }

  const endDrag = () => { drag.current = null }

  const placeRoom = (idx) => {
    setList(l => l.map((r, i) => i === idx ? { ...r, bbox: [32, 32, 34, 26] } : r))
    setSel(idx)
  }

  const addRoom = () => {
    const name = `房間${list.length + 1}`
    setList(l => [...l, { name, area: 0, features: [], color: PALETTE[l.length % PALETTE.length], bbox: [30, 30, 36, 28] }])
    setSel(list.length)
  }

  const removeSel = () => {
    if (sel < 0) return
    setList(l => l.filter((_, i) => i !== sel))
    setSel(-1)
  }

  const renameSel = (name) => {
    setList(l => l.map((r, i) => i === sel ? { ...r, name } : r))
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560, maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>✏️ 調整空間分區</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.6 }}>
            <MousePointerClick size={12} style={{ verticalAlign: -2 }} /> 拖曳色塊移動位置，拖右下角圓點調整大小。框好的分區會用於 3D 漫遊的房間格局。
          </p>

          {/* 平面圖 + 可拖曳分區 */}
          <div ref={boxRef} style={{ position: 'relative', userSelect: 'none', touchAction: 'none', borderRadius: 'var(--r-md)', overflow: 'hidden' }}
            onPointerDown={() => setSel(-1)}>
            <img src={image} alt="平面圖" draggable={false} style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--bg-2)' }} />
            {list.map((r, idx) => r.bbox && (
              <div key={idx}
                onPointerDown={e => startDrag(e, idx, 'move')}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{
                  position: 'absolute',
                  left: `${r.bbox[0]}%`, top: `${r.bbox[1]}%`,
                  width: `${r.bbox[2]}%`, height: `${r.bbox[3]}%`,
                  background: `${r.color}38`,
                  border: `2px ${sel === idx ? 'solid' : 'dashed'} ${r.color}`,
                  borderRadius: 6, cursor: 'move',
                  boxShadow: sel === idx ? `0 0 0 2px ${r.color}66` : 'none',
                }}>
                <span style={{ position: 'absolute', top: 3, left: 6, fontSize: 11, fontWeight: 700, color: '#222', background: 'rgba(255,255,255,0.75)', padding: '1px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                {sel === idx && (
                  <div
                    onPointerDown={e => startDrag(e, idx, 'resize')}
                    onPointerMove={onDragMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    style={{ position: 'absolute', right: -14, bottom: -14, width: 28, height: 28, borderRadius: '50%', background: r.color, border: '3px solid #fff', cursor: 'nwse-resize', boxShadow: '0 1px 6px rgba(0,0,0,0.35)' }} />
                )}
              </div>
            ))}
          </div>

          {/* 未放置的房間 */}
          {unplaced.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>尚未放上平面圖：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unplaced.map(r => (
                  <button key={r.name} className="chip clickable"
                    onClick={() => placeRoom(list.indexOf(r))}
                    style={{ cursor: 'pointer', border: `1px solid ${r.color}`, color: 'var(--text-1)', background: `${r.color}22`, fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>
                    + {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 選取中的房間操作列 */}
          {sel >= 0 && list[sel] && (
            <div className="card" style={{ marginTop: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: list[sel].color, flexShrink: 0 }} />
              <input className="form-input" value={list[sel].name}
                onChange={e => renameSel(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', fontSize: 14 }} />
              <button className="icon-btn" onClick={removeSel} title="刪除此分區">
                <Trash2 size={17} color="var(--c-red)" />
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ gap: 8 }}>
          <button className="btn btn-ghost" onClick={addRoom}><Plus size={15} /> 新增房間</button>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => { onSave(list); onClose() }}>
            <Check size={15} /> 完成（{placed.length} 個分區）
          </button>
        </div>
      </div>
    </div>
  )
}
