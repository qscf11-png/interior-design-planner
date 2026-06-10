import { useState } from 'react'
import { Plus, X, Check, Trash2 } from 'lucide-react'
import { getBudget, saveBudget, getShoppingItems, addShoppingItem, updateShoppingItem, deleteShoppingItem, DEFAULT_CATEGORIES } from '../lib/db'

export default function Budget() {
  const [budget, setBudget] = useState(() => getBudget())
  const [items, setItems] = useState(() => getShoppingItems())
  const [showAdd, setShowAdd] = useState(false)
  const [editTotal, setEditTotal] = useState(false)
  const [totalInput, setTotalInput] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  const refreshItems = () => setItems(getShoppingItems())

  const saveBudgetState = (next) => { setBudget(next); saveBudget(next) }

  const updateCategory = (id, key, val) => {
    const cats = budget.categories.map(c => c.id === id ? { ...c, [key]: Number(val) || 0 } : c)
    saveBudgetState({ ...budget, categories: cats })
  }

  const totalAllocated = budget.categories.reduce((s, c) => s + (budget.total * c.pct / 100), 0)
  const totalSpent = budget.categories.reduce((s, c) => s + (c.spent || 0), 0)
  const spentPct = budget.total > 0 ? Math.round(totalSpent / budget.total * 100) : 0

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>裝修預算</h2>
          <p className="page-subtitle">分項追蹤，精準控管</p>
        </div>
      </div>

      {/* Total Budget */}
      <div className="card gold-border" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>總預算</div>
            {editTotal ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="form-input" type="number" value={totalInput} placeholder="例：1000000"
                  onChange={e => setTotalInput(e.target.value)}
                  style={{ width: 160, padding: '6px 10px' }} autoFocus />
                <span style={{ color: 'var(--text-3)', fontSize: 14 }}>元</span>
                <button className="btn btn-primary btn-sm" onClick={() => { saveBudgetState({ ...budget, total: Number(totalInput) || 0 }); setEditTotal(false) }}>確認</button>
              </div>
            ) : (
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--c-gold)', cursor: 'pointer' }} onClick={() => { setTotalInput(budget.total.toString()); setEditTotal(true) }}>
                {budget.total > 0 ? `NT$ ${budget.total.toLocaleString()}` : '點此設定預算'}
              </div>
            )}
          </div>
          {!editTotal && (
            <button className="btn btn-sm btn-ghost" onClick={() => { setTotalInput(budget.total.toString()); setEditTotal(true) }}>
              {budget.total > 0 ? '修改' : '設定'}
            </button>
          )}
        </div>
        {budget.total > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
              <span>已花費 NT$ {totalSpent.toLocaleString()}</span>
              <span style={{ color: spentPct > 90 ? 'var(--c-red)' : 'var(--text-2)' }}>{spentPct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(spentPct, 100)}%`, background: spentPct > 90 ? 'var(--c-red)' : undefined }} />
            </div>
          </>
        )}
      </div>

      {/* Categories */}
      <div className="section-title">分項預算</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {budget.categories.map(cat => {
          const allocated = Math.round(budget.total * cat.pct / 100)
          const catItems = items.filter(i => i.category === cat.id)
          const pct = allocated > 0 ? Math.min(Math.round(cat.spent / allocated * 100), 100) : 0
          return (
            <div key={cat.id} className="card" onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {budget.total > 0 ? `${allocated.toLocaleString()} 元` : `${cat.pct}%`}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{catItems.length} 項</div>
              </div>

              {activeCategory === cat.id && (
                <div style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">預算比例 (%)</label>
                      <input className="form-input" type="number" value={cat.pct}
                        onChange={e => updateCategory(cat.id, 'pct', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">已花費 (元)</label>
                      <input className="form-input" type="number" value={cat.spent || 0}
                        onChange={e => updateCategory(cat.id, 'spent', e.target.value)} />
                    </div>
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setShowAdd(cat.id) }}>
                    <Plus size={14} /> 新增採購項目
                  </button>
                  {catItems.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {catItems.map(item => (
                        <ShoppingRow key={item.id} item={item} onToggle={() => { updateShoppingItem(item.id, { checked: !item.checked }); refreshItems() }} onDelete={() => { deleteShoppingItem(item.id); refreshItems() }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* All shopping items */}
      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ margin: 0 }}>採購清單</div>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{items.filter(i => i.checked).length}/{items.length} 完成</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <ShoppingRow key={item.id} item={item}
                onToggle={() => { updateShoppingItem(item.id, { checked: !item.checked }); refreshItems() }}
                onDelete={() => { deleteShoppingItem(item.id); refreshItems() }}
              />
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <AddItemModal
          categoryId={showAdd}
          categories={budget.categories}
          onClose={() => setShowAdd(false)}
          onSaved={() => { refreshItems(); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

function ShoppingRow({ item, onToggle, onDelete }) {
  return (
    <div className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, opacity: item.checked ? 0.5 : 1 }}>
      <button onClick={onToggle} style={{
        width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.checked ? 'var(--c-green)' : 'var(--border)'}`,
        background: item.checked ? 'var(--c-green)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {item.checked && <Check size={13} color="white" />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</div>
        {item.price > 0 && <div style={{ fontSize: 12, color: 'var(--c-gold)' }}>NT$ {Number(item.price).toLocaleString()}</div>}
      </div>
      {item.notes && <div style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</div>}
      <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--c-red)', flexShrink: 0 }} onClick={onDelete}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function AddItemModal({ categoryId, categories, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', price: '', notes: '', category: categoryId, link: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => {
    if (!form.name.trim()) return
    addShoppingItem({ ...form, price: Number(form.price) || 0 })
    onSaved()
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>新增採購項目</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">品項名稱 *</label>
            <input className="form-input" value={form.name} placeholder="例：IKEA KALLAX 書架" onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">預估金額（元）</label>
            <input className="form-input" type="number" value={form.price} placeholder="0" onChange={e => set('price', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">類別</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">備註 / 規格</label>
            <input className="form-input" value={form.notes} placeholder="尺寸、顏色..." onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>新增</button>
        </div>
      </div>
    </div>
  )
}
