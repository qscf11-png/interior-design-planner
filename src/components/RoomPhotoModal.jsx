import { useState, useRef } from 'react'
import { X, Camera, Trash2, Compass } from 'lucide-react'
import { compressImage } from '../lib/gaisf'

// 八方位（dir = 這張照片拍到的是房間的哪一面牆）
export const DIRECTIONS = [
  { id: 'NW', label: '西北' }, { id: 'N', label: '北' }, { id: 'NE', label: '東北' },
  { id: 'W',  label: '西' },   { id: 'C', label: '' },   { id: 'E',  label: '東' },
  { id: 'SW', label: '西南' }, { id: 'S', label: '南' }, { id: 'SE', label: '東南' },
]

export default function RoomPhotoModal({ room, photos, onSave, onClose }) {
  const [list, setList] = useState(photos || [])
  const fileRef = useRef()

  const handleFiles = async (files) => {
    const imgs = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      // 縮至 1280px 控制 localStorage 用量
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = e => res(e.target.result)
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const compressed = await compressImage(dataUrl, 1280, 0.8).catch(() => dataUrl)
      imgs.push({ img: compressed, dir: 'N' })
    }
    setList(l => [...l, ...imgs])
  }

  const setDir = (idx, dir) => setList(l => l.map((p, i) => i === idx ? { ...p, dir } : p))
  const remove = (idx) => setList(l => l.filter((_, i) => i !== idx))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxHeight: '88dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>📷 {room} 的照片</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>
            上傳這個房間的現場照片，並標記<b>照片拍到的是房間的哪一面</b>（以平面圖上方為北），3D 漫遊時照片會掛在對應的牆上。
          </p>

          {/* 照片列表 */}
          {list.map((p, idx) => (
            <div key={idx} className="card" style={{ padding: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <img src={p.img} alt="" style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 'var(--r-md)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Compass size={13} /> 拍到的牆面
                    </span>
                    <button className="icon-btn" onClick={() => remove(idx)} title="刪除照片">
                      <Trash2 size={15} color="var(--c-red)" />
                    </button>
                  </div>
                  {/* 九宮格方位選擇 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                    {DIRECTIONS.map(d => d.id === 'C'
                      ? <div key="C" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧭</div>
                      : (
                        <button key={d.id}
                          onClick={() => setDir(idx, d.id)}
                          style={{
                            padding: '5px 0', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${p.dir === d.id ? 'var(--c-gold)' : 'var(--border)'}`,
                            background: p.dir === d.id ? 'var(--c-gold-muted)' : 'var(--bg-2)',
                            color: p.dir === d.id ? 'var(--c-gold)' : 'var(--text-3)',
                          }}>
                          {d.label}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 新增照片 */}
          <button className="btn btn-block" onClick={() => fileRef.current.click()}
            style={{ border: '1px dashed var(--border)', background: 'var(--bg-glass)' }}>
            <Camera size={16} /> 新增照片（可多選）
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={e => { handleFiles([...e.target.files]); e.target.value = '' }} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => { onSave(room, list); onClose() }}>
            儲存（{list.length} 張）
          </button>
        </div>
      </div>
    </div>
  )
}
