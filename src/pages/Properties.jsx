import { useState } from 'react'
import { Plus, X, Trash2, Camera, Star } from 'lucide-react'
import { getProperties, addProperty, updateProperty, deleteProperty, getFavorites } from '../lib/db'
import Lightbox from '../components/Lightbox'

const STATUS_OPTIONS = [
  { value: 'interested', label: '感興趣', chip: 'chip-gold' },
  { value: 'considering', label: '考慮中', chip: 'chip-blue' },
  { value: 'excluded', label: '已排除', chip: 'chip-red' },
  { value: 'selected', label: '已選定', chip: 'chip-green' },
]
const TYPE_OPTIONS = ['電梯大樓', '透天', '公寓', '華廈', '套房']

function StarRating({ value = 0, onChange, readonly }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`star${n <= value ? ' active' : ''}`}
          onClick={readonly ? undefined : () => onChange(n)}>★</span>
      ))}
    </div>
  )
}

export default function Properties() {
  const [items, setItems] = useState(() => getProperties())
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [viewItem, setViewItem] = useState(null)

  const refresh = () => setItems(getProperties())

  const handleDelete = (id) => {
    if (confirm('確定刪除此物件？')) { deleteProperty(id); refresh() }
  }

  const statusInfo = (v) => STATUS_OPTIONS.find(s => s.value === v) || STATUS_OPTIONS[0]

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>看房物件</h2>
          <p className="page-subtitle">{items.length} 個已記錄</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditId(null); setShowForm(true) }}>
          <Plus size={16} /> 新增
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <h3>尚無看房記錄</h3>
          <p>每次看房後立即記錄，<br />比較優缺點更有效率</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> 新增第一個物件
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(item => (
            <PropertyCard
              key={item.id}
              item={item}
              onView={() => setViewItem(item)}
              onEdit={() => { setEditId(item.id); setShowForm(true) }}
              onDelete={() => handleDelete(item.id)}
              statusInfo={statusInfo(item.status)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <PropertyForm
          editId={editId}
          initial={editId ? items.find(i => i.id === editId) : null}
          onClose={() => setShowForm(false)}
          onSaved={refresh}
        />
      )}
      {viewItem && (
        <PropertyDetail
          item={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={() => { setEditId(viewItem.id); setViewItem(null); setShowForm(true) }}
        />
      )}
    </div>
  )
}

function PropertyCard({ item, onView, onEdit, onDelete, statusInfo }) {
  return (
    <div className="card clickable" onClick={onView} style={{ padding: 0, overflow: 'hidden' }}>
      {/* Photo area */}
      <div style={{
        height: 140, position: 'relative', overflow: 'hidden',
        background: item.photos?.[0]
          ? 'none'
          : 'linear-gradient(135deg, var(--bg-2), rgba(212,168,83,0.08))',
      }}>
        {item.photos?.[0]
          ? <img src={item.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🏠</div>
        }
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 60%)',
        }} />
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span className={`chip ${statusInfo.chip}`}>{statusInfo.label}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{item.name || '未命名物件'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{item.address}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--c-gold)' }}>
              {item.price ? `${item.price}萬` : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.size ? `${item.size}坪` : ''}</div>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <StarRating value={item.rating || 0} readonly />
        <div style={{ display: 'flex', gap: 8 }}>
          {item.floor && <span className="chip chip-muted">{item.floor}樓</span>}
          {item.type && <span className="chip chip-muted">{item.type}</span>}
        </div>
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={onEdit}>✏️</button>
          <button className="icon-btn btn-danger" style={{ width: 32, height: 32, color: 'var(--c-red)' }} onClick={onDelete}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function PropertyForm({ editId, initial, onClose, onSaved }) {
  const blank = { name: '', address: '', price: '', size: '', floor: '', type: '電梯大樓', age: '', status: 'interested', rating: 3, pros: '', cons: '', notes: '', photos: [] }
  const [form, setForm] = useState(initial ? { ...blank, ...initial, pros: (initial.pros || []).join('\n'), cons: (initial.cons || []).join('\n') } : blank)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePhoto = async (e) => {
    const files = Array.from(e.target.files)
    const results = await Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f)
    })))
    set('photos', [...(form.photos || []), ...results].slice(0, 5))
  }

  const handleSave = () => {
    const data = {
      ...form,
      price: Number(form.price) || 0,
      size: Number(form.size) || 0,
      age: Number(form.age) || 0,
      pros: form.pros.split('\n').map(s => s.trim()).filter(Boolean),
      cons: form.cons.split('\n').map(s => s.trim()).filter(Boolean),
    }
    if (editId) { updateProperty(editId, data) } else { addProperty(data) }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editId ? '編輯物件' : '新增物件'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">物件暱稱</label>
            <input className="form-input" value={form.name} placeholder="例：信義路三房" onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">地址</label>
            <input className="form-input" value={form.address} placeholder="台北市..." onChange={e => set('address', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">開價（萬元）</label>
              <input className="form-input" type="number" value={form.price} placeholder="2800" onChange={e => set('price', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">坪數</label>
              <input className="form-input" type="number" value={form.size} placeholder="28.5" onChange={e => set('size', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">樓層</label>
              <input className="form-input" value={form.floor} placeholder="8/22" onChange={e => set('floor', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">屋齡（年）</label>
              <input className="form-input" type="number" value={form.age} placeholder="15" onChange={e => set('age', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">類型</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">狀態</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">我的評分</label>
            <StarRating value={form.rating} onChange={v => set('rating', v)} />
          </div>
          <div className="form-group">
            <label className="form-label">優點（每行一個）</label>
            <textarea className="form-textarea" value={form.pros} placeholder="採光好&#10;近捷運&#10;格局方正" onChange={e => set('pros', e.target.value)} style={{ minHeight: 70 }} />
          </div>
          <div className="form-group">
            <label className="form-label">缺點（每行一個）</label>
            <textarea className="form-textarea" value={form.cons} placeholder="管理費高&#10;停車位另購" onChange={e => set('cons', e.target.value)} style={{ minHeight: 70 }} />
          </div>
          <div className="form-group">
            <label className="form-label">備註</label>
            <textarea className="form-textarea" value={form.notes} placeholder="其他想記錄的事..." onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">照片（最多5張）</label>
            <label className="upload-zone" style={{ padding: 16 }}>
              <Camera size={20} style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: 13 }}>點擊選取照片</div>
              <input type="file" accept="image/*" multiple hidden onChange={handlePhoto} />
            </label>
            {form.photos?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {form.photos.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} />
                    <button onClick={() => set('photos', form.photos.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, background: 'var(--c-red)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>儲存</button>
        </div>
      </div>
    </div>
  )
}

function PropertyDetail({ item, onClose, onEdit }) {
  const statusInfo = STATUS_OPTIONS.find(s => s.value === item.status) || STATUS_OPTIONS[0]
  // 這個物件收藏的設計圖
  const designFavs = getFavorites().filter(f => f.propertyId === item.id)
  const [view, setView] = useState(null)
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{item.name || '物件詳情'}</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-sm btn-ghost" onClick={onEdit}>編輯</button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        <div className="modal-body">
          {item.photos?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
              {item.photos.map((src, i) => (
                <img key={i} src={src} style={{ height: 120, borderRadius: 'var(--r-md)', flexShrink: 0 }} />
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className={`chip ${statusInfo.chip}`}>{statusInfo.label}</span>
            {item.type && <span className="chip chip-muted">{item.type}</span>}
            {item.floor && <span className="chip chip-muted">{item.floor}樓</span>}
          </div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-value text-gold">{item.price ? `${item.price}萬` : '—'}</div><div className="stat-label">開價</div></div>
            <div className="stat-card"><div className="stat-value">{item.size ? `${item.size}坪` : '—'}</div><div className="stat-label">坪數</div></div>
          </div>
          <div style={{ marginBottom: 12 }}><div className="section-title">我的評分</div><StarRating value={item.rating || 0} readonly /></div>
          {item.address && <div className="form-group" style={{ marginBottom: 12 }}><div className="section-title">地址</div><div style={{ fontSize: 14, color: 'var(--text-2)' }}>{item.address}</div></div>}
          {item.pros?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title">優點</div>
              {item.pros.map((p, i) => <div key={i} style={{ fontSize: 14, color: 'var(--c-green)', marginTop: 4 }}>✓ {p}</div>)}
            </div>
          )}
          {item.cons?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="section-title">缺點</div>
              {item.cons.map((c, i) => <div key={i} style={{ fontSize: 14, color: 'var(--c-red)', marginTop: 4 }}>✗ {c}</div>)}
            </div>
          )}
          {item.notes && <div style={{ marginBottom: 12 }}><div className="section-title">備註</div><div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{item.notes}</div></div>}

          {designFavs.length > 0 && (
            <div>
              <div className="section-title">🖼️ 設計收藏（{designFavs.length}）</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {designFavs.map(f => (
                  <div key={f.id} style={{ flexShrink: 0 }}>
                    <img src={f.img} alt={f.title} onClick={() => setView(f.img)}
                      style={{ height: 120, borderRadius: 'var(--r-md)', cursor: 'zoom-in', border: '1px solid var(--c-gold-border)' }} />
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {view && <Lightbox src={view} alt="設計收藏" onClose={() => setView(null)} />}
    </div>
  )
}
