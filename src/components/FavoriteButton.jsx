import { useState, useRef } from 'react'
import { Star } from 'lucide-react'
import { getProperties, addFavorite, deleteFavorite, findFavoriteByImg } from '../lib/db'

// 收藏按鈕：點擊收藏（有看房物件時可選歸屬），再點取消收藏
// variant='light' 卡片用（金色 chip）、'dark' 燈箱用（深色圓鈕）
export default function FavoriteButton({ img, title, variant = 'light' }) {
  const [favId, setFavId] = useState(() => (img ? findFavoriteByImg(img)?.id : null) || null)
  const [picker, setPicker] = useState(false)
  const [err, setErr] = useState(null)
  const properties = useRef(getProperties()).current
  const dark = variant === 'dark'

  const save = (pid) => {
    try {
      const f = addFavorite({ img, title: title || '設計圖', propertyId: pid || null })
      setFavId(f.id); setPicker(false); setErr(null)
    } catch (e) { setErr(e.message); setPicker(false) }
  }
  const onClick = () => {
    if (favId) { deleteFavorite(favId); setFavId(null); return }
    if (properties.length) setPicker(p => !p)  // 有物件 → 選歸屬
    else save(null)                            // 無物件 → 直接存未分類
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {dark ? (
        <button onClick={onClick} title={favId ? '取消收藏' : '收藏'}
          style={{ width: 42, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: favId ? 'rgba(212,168,83,0.92)' : 'rgba(20,20,28,0.6)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Star size={20} fill={favId ? '#fff' : 'none'} color="#fff" />
        </button>
      ) : (
        <button onClick={onClick}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${favId ? 'var(--c-gold)' : 'var(--c-gold-border)'}`,
            background: favId ? 'var(--c-gold-muted)' : 'var(--bg-glass)', color: 'var(--c-gold)' }}>
          <Star size={14} fill={favId ? 'var(--c-gold)' : 'none'} /> {favId ? '已收藏' : '收藏'}
        </button>
      )}

      {picker && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20, width: 200, background: dark ? 'rgba(28,28,36,0.97)' : 'var(--bg-1)', backdropFilter: 'blur(12px)', borderRadius: 12, border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`, overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.35)' }}>
          <div style={{ padding: '8px 12px', fontSize: 12, color: dark ? 'rgba(255,255,255,0.6)' : 'var(--text-3)', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'var(--border)'}` }}>收藏到哪個物件？</div>
          <button onClick={() => save(null)} style={item(dark)}>📦 未分類收藏</button>
          {properties.map(p => (
            <button key={p.id} onClick={() => save(p.id)} style={item(dark)}>🏠 {p.name || '未命名物件'}</button>
          ))}
        </div>
      )}
      {err && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20, width: 200, fontSize: 11, color: '#fff', background: 'rgba(208,64,64,0.95)', padding: '8px 10px', borderRadius: 8 }}>⚠️ {err}</div>
      )}
    </div>
  )
}

const item = (dark) => ({
  display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
  fontSize: 13, color: dark ? '#fff' : 'var(--text-1)', background: 'transparent',
  border: 'none', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`, cursor: 'pointer',
})
