import { useState, useMemo } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { calculateFengshui, DIRECTIONS, SHA_OPTIONS, TK_GUA } from '../lib/fengshui'
import { streamChat } from '../lib/gaisf'

// 評級顏色（對應 App 既有 CSS 變數）
const LEVEL_COLOR = { green: 'var(--c-green)', gold: 'var(--c-gold)', orange: '#e0903a', red: 'var(--c-red)' }

function DirSelect({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
        {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  )
}

function Section({ title, items }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-title">{title}</div>
      {items.map((d, i) => (
        <div key={i} style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.6 }}>{d}</div>
      ))}
    </div>
  )
}

export default function FengShui({ settings }) {
  // 預設帶入 TK 的理想格局（坐北朝南：朝南/門東南/主臥北/廚房東北）
  const [facing, setFacing] = useState('南')
  const [door, setDoor] = useState('東南')
  const [bedroom, setBedroom] = useState('北')
  const [kitchen, setKitchen] = useState('東北')
  const [lighting, setLighting] = useState(4)
  const [shas, setShas] = useState([])
  const [ai, setAi] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const result = useMemo(
    () => calculateFengshui({ facing, door, bedroom, kitchen, shas, lighting }),
    [facing, door, bedroom, kitchen, shas, lighting]
  )

  const toggleSha = (s) =>
    setShas(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]))

  const askAi = async () => {
    setAiLoading(true); setAi('')
    const prompt = `請用繁體中文、親切口氣，幫我白話解讀這間房子的風水（我是巽木東四命）：
總分 ${result.scores.total}/100（${result.rating}）。房屋朝${facing}、大門${door}、主臥${bedroom}、廚房${kitchen}、採光${lighting}/5。
八宅本命 ${result.scores.bazhai}/40、2026流年 ${result.scores.star}/30、巒頭採光 ${result.scores.env}/30。
請說明這間適不適合我、最大優缺點、以及若要靠裝潢調整有哪些重點。150 字內。`
    try {
      for await (const chunk of streamChat([{ role: 'user', content: prompt }], settings)) {
        setAi(prev => prev + chunk)
      }
    } catch (e) {
      setAi(e.message === 'NO_CONFIG'
        ? '請先點右上角 ⚙️ 設定填入達哥 GAISF 或 Gemini 金鑰，才能用 AI 解讀。'
        : `解讀失敗：${e.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  const color = LEVEL_COLOR[result.level]

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>風水評分</h2>
          <p className="page-subtitle">八宅明鏡 × 2026 流年飛星 · {TK_GUA}</p>
        </div>
      </div>

      {/* 輸入區 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row">
          <DirSelect label="🧭 房屋朝向" value={facing} onChange={setFacing} />
          <DirSelect label="🚪 大門方位" value={door} onChange={setDoor} />
        </div>
        <div className="form-row">
          <DirSelect label="🛏️ 主臥方位" value={bedroom} onChange={setBedroom} />
          <DirSelect label="🍳 廚房方位" value={kitchen} onChange={setKitchen} />
        </div>
        <div className="form-group">
          <label className="form-label">☀️ 採光通風：{lighting} / 5</label>
          <input type="range" min="1" max="5" value={lighting}
            onChange={e => setLighting(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div className="form-group">
          <label className="form-label">🔪 外部沖煞（可複選）</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SHA_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleSha(s)}
                className={`chip ${shas.includes(s) ? 'chip-red' : 'chip-muted'}`}
                style={{ cursor: 'pointer', border: 'none' }}>
                {shas.includes(s) ? '✓ ' : ''}{s}
              </button>
            ))}
            {shas.length === 0 && <span className="chip chip-green">目前判定：無煞</span>}
          </div>
        </div>
      </div>

      {/* 分數區 */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>綜合風水指數</div>
        <div style={{ fontSize: 52, fontWeight: 800, color, lineHeight: 1.1 }}>
          {result.scores.total}<span style={{ fontSize: 20, color: 'var(--text-3)' }}> / 100</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, color, marginTop: 4 }}>{result.rating}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>{result.ratingDesc}</div>
        <div className="grid-2" style={{ marginTop: 14 }}>
          <div className="stat-card"><div className="stat-value">{result.scores.bazhai}<span style={{ fontSize: 12, color: 'var(--text-3)' }}>/40</span></div><div className="stat-label">八宅本命</div></div>
          <div className="stat-card"><div className="stat-value">{result.scores.star}<span style={{ fontSize: 12, color: 'var(--text-3)' }}>/30</span></div><div className="stat-label">2026 流年</div></div>
        </div>
        <div className="stat-card" style={{ marginTop: 10 }}>
          <div className="stat-value">{result.scores.env}<span style={{ fontSize: 12, color: 'var(--text-3)' }}>/30</span></div>
          <div className="stat-label">巒頭採光</div>
        </div>
      </div>

      {/* 三維度細項 */}
      <Section title="☯️ 八宅本命共振 (40)" items={result.bazhaiDetails} />
      <Section title="📅 2026 流年飛星 (30)" items={result.starDetails} />
      <Section title="🔪 巒頭外煞與採光 (30)" items={result.envDetails} />

      {/* 化解建議 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">🛠️ 化解與佈局建議</div>
        {result.remedies.map((r, i) => (
          <div key={i} style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.6 }}>• {r}</div>
        ))}
      </div>

      {/* AI 白話解讀（接達哥 GAISF / Gemini） */}
      <button className="btn btn-primary btn-block" onClick={askAi} disabled={aiLoading}>
        {aiLoading
          ? <><Loader2 size={16} className="animate-spin" /> 達哥解讀中...</>
          : <><Sparkles size={16} /> 請達哥白話解讀</>}
      </button>
      {ai && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title">🤖 達哥的解讀</div>
          <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ai}</div>
        </div>
      )}
    </div>
  )
}
