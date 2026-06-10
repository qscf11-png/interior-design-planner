import { useState, useRef } from 'react'
import { Plus, X, Sparkles } from 'lucide-react'
import { getStyleData, saveStyleData } from '../lib/db'
import { extractColors, analyzeImage } from '../lib/gaisf'

const QUIZ = [
  {
    q: '你希望家的整體感受是？',
    options: [
      { val: 'A', label: '清爽簡潔', emoji: '🤍', desc: '留白、透氣' },
      { val: 'B', label: '溫暖自然', emoji: '🌿', desc: '木質、舒適' },
      { val: 'C', label: '俐落設計感', emoji: '⬛', desc: '線條、理性' },
      { val: 'D', label: '奢華精緻', emoji: '✨', desc: '細節、品味' },
    ]
  },
  {
    q: '你喜歡的主色調？',
    options: [
      { val: 'A', label: '白灰米', emoji: '🔘', desc: '乾淨無色系' },
      { val: 'B', label: '大地色', emoji: '🟤', desc: '棕米綠茶' },
      { val: 'C', label: '深色系', emoji: '🌑', desc: '黑灰炭' },
      { val: 'D', label: '跳色點綴', emoji: '🎨', desc: '局部亮色' },
    ]
  },
  {
    q: '理想中的家具風格？',
    options: [
      { val: 'A', label: '簡潔布沙發', emoji: '🛋️', desc: '北歐/無印' },
      { val: 'B', label: '低矮坐墊', emoji: '🇯🇵', desc: '日式榻榻米' },
      { val: 'C', label: '金屬皮革', emoji: '🔩', desc: '工業 Loft' },
      { val: 'D', label: '絲絨高腳', emoji: '👑', desc: '輕奢風格' },
    ]
  },
  {
    q: '你最喜歡的材質質感？',
    options: [
      { val: 'A', label: '清水模/白牆', emoji: '🧱', desc: 'Concrete' },
      { val: 'B', label: '原木/竹藤', emoji: '🪵', desc: 'Natural' },
      { val: 'C', label: '金屬/玻璃', emoji: '🔲', desc: 'Industrial' },
      { val: 'D', label: '大理石/黃銅', emoji: '💎', desc: 'Luxury' },
    ]
  },
  {
    q: '哪個關鍵字最吸引你？',
    options: [
      { val: 'A', label: 'Japandi', emoji: '🌸', desc: '日北歐融合' },
      { val: 'B', label: 'Wabi-Sabi', emoji: '🍂', desc: '侘寂美學' },
      { val: 'C', label: 'Industrial', emoji: '🏭', desc: '工業倉庫風' },
      { val: 'D', label: 'New Chinese', emoji: '🏮', desc: '新中式' },
    ]
  },
]

const STYLE_MAP = {
  A: { name: '極簡北歐風', desc: '以白灰米為基調，家具線條簡潔，注重機能與空間感，搭配木質暖色點綴。', palette: ['#f5f2ee', '#e8e0d5', '#c4b49a', '#8b7355', '#3d3530'] },
  B: { name: '日式侘寂風', desc: '擁抱自然材質與不完美之美，低調的大地色系，質樸的觸感，靜謐的氛圍。', palette: ['#ede8e0', '#c8bfb0', '#9a8e7e', '#6b5f50', '#3d3228'] },
  C: { name: '現代工業風', desc: '裸露管線與混凝土牆面，金屬與皮革為主材質，深色系搭配工業燈具。', palette: ['#2d2d2d', '#4a4a4a', '#787878', '#b8b8b8', '#d4a853'] },
  D: { name: '輕奢精品風', desc: '大理石與黃銅細節，絲絨與皮革家具，深色牆面搭配點狀照明，彰顯品味。', palette: ['#1a1520', '#2d2438', '#8b7cf6', '#d4a853', '#f0ede8'] },
}

function getStyle(answers) {
  const counts = { A: 0, B: 0, C: 0, D: 0 }
  Object.values(answers).forEach(v => { if (counts[v] !== undefined) counts[v]++ })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

export default function StyleBoard({ settings }) {
  const [data, setData] = useState(() => getStyleData())
  const [quizStep, setQuizStep] = useState(data.styleResult ? -1 : 0)
  const fileRef = useRef()

  const save = (updates) => {
    const next = { ...data, ...updates }
    setData(next); saveStyleData(next)
  }

  const handleAnswer = (val) => {
    const answers = { ...data.quizAnswers, [quizStep]: val }
    if (quizStep < QUIZ.length - 1) {
      save({ quizAnswers: answers })
      setQuizStep(s => s + 1)
    } else {
      const key = getStyle(answers)
      save({ quizAnswers: answers, styleResult: STYLE_MAP[key] })
      setQuizStep(-1)
    }
  }

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const src = e.target.result
      const img = new Image()
      img.onload = async () => {
        const colors = extractColors(img)
        const allImages = [...(data.images || []), { src, colors }].slice(0, 12)
        const allColors = [...new Set(allImages.flatMap(i => i.colors))].slice(0, 18)
        save({ images: allImages, palette: allColors })
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (i) => {
    const images = data.images.filter((_, j) => j !== i)
    const palette = [...new Set(images.flatMap(img => img.colors))].slice(0, 18)
    save({ images, palette })
  }

  if (quizStep >= 0) {
    const q = QUIZ[quizStep]
    return (
      <div className="page">
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>風格測驗 {quizStep + 1} / {QUIZ.length}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => { save({ quizAnswers: {}, styleResult: null }); setQuizStep(-1) }}>跳過</button>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${((quizStep + 1) / QUIZ.length) * 100}%` }} /></div>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, lineHeight: 1.4 }}>{q.q}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {q.options.map(opt => (
            <button key={opt.val} className="card clickable"
              style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '16px', background: data.quizAnswers[quizStep] === opt.val ? 'var(--c-gold-muted)' : undefined, borderColor: data.quizAnswers[quizStep] === opt.val ? 'var(--c-gold-border)' : undefined }}
              onClick={() => handleAnswer(opt.val)}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>{opt.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>風格色板</h2>
          <p className="page-subtitle">定義你的家的靈魂</p>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => { save({ quizAnswers: {}, styleResult: null }); setQuizStep(0) }}>
          重新測驗
        </button>
      </div>

      {/* Style result */}
      {data.styleResult ? (
        <div className="card gold-border" style={{ marginBottom: 20 }}>
          <div className="section-title">你的設計風格</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--c-gold)' }}>
            {data.styleResult.name} ✨
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', marginBottom: 14 }}>{data.styleResult.desc}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {data.styleResult.palette?.map(c => (
              <div key={c} style={{ flex: 1, height: 32, background: c, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }} title={c} />
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎨</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>尚未完成風格測驗</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setQuizStep(0)}>開始測驗</button>
        </div>
      )}

      {/* Extracted palette */}
      {data.palette?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-title">靈感萃取色盤</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.palette.map(c => (
              <div key={c} title={c} style={{ width: 44, height: 44, background: c, borderRadius: 'var(--r-sm)', border: '2px solid var(--border)', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => navigator.clipboard?.writeText(c)} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>點擊色塊可複製色碼</div>
        </div>
      )}

      {/* Inspiration images */}
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>靈感照片牆</div>
        <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
          <Plus size={14} /> 新增
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => Array.from(e.target.files).forEach(handleImageUpload)} />
        </label>
      </div>

      {data.images?.length === 0 || !data.images ? (
        <label className="upload-zone" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>上傳靈感照片</div>
          <div style={{ fontSize: 13 }}>AI 自動萃取配色，建立你的色盤</div>
          <input type="file" accept="image/*" multiple hidden onChange={e => Array.from(e.target.files).forEach(handleImageUpload)} />
        </label>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {data.images.map((img, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', aspectRatio: '1' }}>
              <img src={img.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', gap: 2, padding: 4, background: 'rgba(0,0,0,0.5)' }}>
                {img.colors?.slice(0, 4).map(c => (
                  <div key={c} style={{ flex: 1, height: 6, background: c, borderRadius: 2 }} />
                ))}
              </div>
              <button onClick={() => removeImage(i)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-md)', border: '2px dashed var(--border)', aspectRatio: '1', cursor: 'pointer', color: 'var(--text-3)', transition: 'all var(--t-fast)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-gold-border)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <Plus size={24} />
            <input type="file" accept="image/*" multiple hidden onChange={e => Array.from(e.target.files).forEach(handleImageUpload)} />
          </label>
        </div>
      )}

      {/* External style tools */}
      <div className="divider" />
      <div className="section-title">更多靈感來源</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { name: 'RoomsGPT', url: 'https://www.roomsgpt.io', desc: '空房照→61種風格預覽' },
          { name: 'Interior AI', url: 'https://interiorai.com', desc: '上傳照片重新設計' },
          { name: 'Decory', url: 'https://www.decory.ai', desc: '30秒風格渲染' },
        ].map(t => (
          <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer"
            className="card" style={{ flex: '1 1 130px', textDecoration: 'none', padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
