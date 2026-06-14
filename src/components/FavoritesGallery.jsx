import { useState } from 'react'
import { X, Trash2, ImageOff } from 'lucide-react'
import { getFavorites, getProperties, deleteFavorite } from '../lib/db'
import Lightbox from './Lightbox'

// 設計收藏總相簿：可依看房物件篩選、放大、刪除
// initialPropertyId：從物件詳情開啟時預設篩選該物件
export default function FavoritesGallery({ onClose, initialPropertyId = 'all' }) {
  const [favs, setFavs] = useState(() => getFavorites())
  const properties = getProperties()
  const [filter, setFilter] = useState(initialPropertyId)
  const [view, setView] = useState(null)

  const propName = (pid) => properties.find(p => p.id === pid)?.name || '未命名物件'

  const filtered = favs.filter(f =>
    filter === 'all' ? true
      : filter === 'none' ? !f.propertyId
        : f.propertyId === filter
  )

  const handleDelete = (id) => {
    deleteFavorite(id)
    setFavs(getFavorites())
  }

  // 篩選選項：全部 + 未分類 + 各物件（只列有收藏的物件）
  const usedPropIds = new Set(favs.map(f => f.propertyId).filter(Boolean))
  const chips = [
    { id: 'all', label: `全部 ${favs.length}` },
    ...(favs.some(f => !f.propertyId) ? [{ id: 'none', label: '未分類' }] : []),
    ...properties.filter(p => usedPropIds.has(p.id)).map(p => ({ id: p.id, label: p.name || '未命名' })),
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 620, maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>🖼️ 設計收藏</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {favs.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon"><ImageOff size={40} /></div>
              <h3>還沒有收藏</h3>
              <p>生成設計圖後點開放大，<br />按右上角 ⭐ 即可收藏喜歡的圖</p>
            </div>
          ) : (
            <>
              {/* 物件篩選 */}
              {chips.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {chips.map(c => (
                    <button key={c.id} onClick={() => setFilter(c.id)}
                      style={{
                        padding: '5px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${filter === c.id ? 'var(--c-gold)' : 'var(--border)'}`,
                        background: filter === c.id ? 'var(--c-gold-muted)' : 'var(--bg-2)',
                        color: filter === c.id ? 'var(--c-gold)' : 'var(--text-3)',
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 收藏網格 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {filtered.map(f => (
                  <div key={f.id} className="card" style={{ padding: 8, position: 'relative' }}>
                    <img src={f.img} alt={f.title} onClick={() => setView(f.img)}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--r-sm)', cursor: 'zoom-in' }} />
                    <button onClick={() => handleDelete(f.id)} title="刪除收藏"
                      style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(20,20,28,0.6)', backdropFilter: 'blur(6px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                      {f.propertyId ? `🏠 ${propName(f.propertyId)}` : '📦 未分類'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 放大檢視（相簿內已收藏，不再顯示收藏鈕） */}
      {view && <Lightbox src={view} alt="收藏設計圖" onClose={() => setView(null)} />}
    </div>
  )
}
