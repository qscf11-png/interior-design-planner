import { useState, useRef } from 'react'
import { Upload, Sparkles, ExternalLink, RefreshCw, Image, Wand2 } from 'lucide-react'
import { analyzeImage, editImage, compressImage } from '../lib/gaisf'

const FLOOR_PLAN_PROMPT = `你是一位專業的室內設計師，請仔細分析這張平面圖或房間照片，以JSON格式回傳分析結果。
只回傳JSON，不要任何其他說明文字。若無法確定某些數值，請合理估計。

{
  "summary": "格局整體描述（2-3句）",
  "totalArea": 30,
  "rooms": [
    { "name": "客廳", "area": 10, "orientation": "南", "features": ["開放式", "落地窗"], "color": "#d4a853" },
    { "name": "主臥", "area": 8, "orientation": "南", "features": ["主衛"], "color": "#8b7cf6" }
  ],
  "strengths": ["採光充足", "動線流暢"],
  "issues": ["廚房偏小", "無儲藏室"],
  "style": "現代簡約",
  "estimatedBudget": "80-120萬"
}`

const ROOM_COLORS = ['#d4a853', '#8b7cf6', '#5cba9d', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa', '#34d399', '#fb923c']

const DESIGN_STYLES = [
  { id: 'scandinavian', name: '北歐極簡', emoji: '🤍', desc: '白灰木質、簡潔線條、自然採光', palette: ['#f5f2ee', '#e8e0d5', '#c4b49a', '#8b7355'], costPerPing: [3, 5], prompt: '北歐極簡風格，白色牆面搭配淺色木質家具，簡約線條，大量自然光，棉麻織品點綴', ceiling: 'smooth flat white ceiling with recessed downlights and one minimal Nordic pendant lamp' },
  { id: 'japandi', name: '日式侘寂', emoji: '🍂', desc: '素雅大地色、原木、留白美學', palette: ['#ede8e0', '#c8bfb0', '#9a8e7e', '#6b5f50'], costPerPing: [3, 5], prompt: '日式侘寂風格，大地色系，低矮原木家具，榻榻米元素，紙質燈飾，質樸不完美的美感', ceiling: 'light timber wood slat ceiling feature with warm indirect lighting and a washi paper pendant' },
  { id: 'industrial', name: '現代工業', emoji: '🏭', desc: '水泥灰、金屬管線、粗獷質感', palette: ['#2d2d2d', '#4a4a4a', '#787878', '#d4a853'], costPerPing: [3, 5], prompt: '工業風格，裸露水泥牆面與管線，金屬材質燈具，皮革沙發，深色調搭配暖色燈光', ceiling: 'exposed raw concrete ceiling with visible black ducts, pipes and black track lighting' },
  { id: 'luxury', name: '輕奢精品', emoji: '✨', desc: '大理石、黃銅、絲絨質感', palette: ['#1a1520', '#2d2438', '#8b7cf6', '#d4a853'], costPerPing: [6, 10], prompt: '輕奢風格，大理石檯面與地板，黃銅金屬細節，絲絨材質家具，深色牆面配暖色燈帶', ceiling: 'layered recessed ceiling with warm LED cove lighting and an elegant brass chandelier' },
  { id: 'muji', name: '無印良品', emoji: '🌿', desc: '白橡木、收納整齊、生活感', palette: ['#faf8f5', '#e8dfd4', '#b8a88a', '#7a6b55'], costPerPing: [2.5, 4], prompt: '無印良品風格，白色與淺橡木色為主，開放式收納，簡約實用家具，綠植點綴，溫暖生活感', ceiling: 'clean flat white ceiling with simple round wooden flush-mount lights' },
  { id: 'newchinese', name: '新中式', emoji: '🏮', desc: '東方韻味、現代手法、雅致配色', palette: ['#2b1d12', '#6b3a2a', '#c8956c', '#e8d5b8'], costPerPing: [5, 8], prompt: '新中式風格，深色胡桃木家具，中式屏風與水墨畫元素，暖色燈光，現代簡約線條融合東方韻味', ceiling: 'dark wooden lattice grid ceiling feature with warm cove lighting and modern Chinese lantern pendants' },
  { id: 'cream', name: '奶油暖風', emoji: '🧈', desc: '米白奶茶色、柔軟圓弧、療癒', palette: ['#faf5ef', '#efe5d8', '#d4c4ae', '#b8a890'], costPerPing: [3, 5], prompt: '奶油風格，米白與奶茶色系，圓弧造型家具，柔軟布藝，暖色調燈光，溫馨療癒氛圍', ceiling: 'soft curved cove ceiling in cream tone with warm hidden LED strip lighting and a fabric pendant' },
  { id: 'midcentury', name: '復古摩登', emoji: '🪑', desc: '60年代經典、木腳家具、跳色', palette: ['#f0ebe3', '#c17f59', '#3d6b5e', '#d4a853'], costPerPing: [4, 7], prompt: '中世紀現代風格，經典木腳家具，幾何圖案地毯，跳色抱枕，黃銅與柚木搭配，復古氛圍', ceiling: 'flat ceiling with a statement mid-century sputnik brass chandelier and walnut wood trim accents' },
]

function estimateBudget(style, totalArea) {
  const area = totalArea || 30
  const min = Math.round(style.costPerPing[0] * area)
  const max = Math.round(style.costPerPing[1] * area)
  return `${min}-${max}萬`
}

const EXTERNAL_TOOLS = [
  { name: 'Planner 5D', url: 'https://planner5d.com/ai', desc: '上傳平面圖→自動辨識→可編輯3D', icon: '🏗️' },
  { name: 'Pixelcut', url: 'https://www.pixelcut.ai/create/convert-2d-plan-to-3d', desc: '2D 圖→3D 渲染', icon: '🎯' },
  { name: 'Floor-Plan.ai', url: 'https://floor-plan.ai/floor-plan-to-3d', desc: '拖放繪製+3D預覽', icon: '📐' },
]

export default function FloorPlan({ settings }) {
  const [image, setImage] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      // 壓縮圖片以符合 API 傳輸限制（Vercel 4.5MB）
      const compressed = await compressImage(e.target.result).catch(() => e.target.result)
      setImage(compressed); setResult(null); setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const handleAnalyze = async () => {
    if (!image) return
    if (!settings?.apiKey && !settings?.geminiApiKey) { setError('請先在設定中填入 API Key'); return }
    setAnalyzing(true); setError(null)
    try {
      const raw = await analyzeImage(image, FLOOR_PLAN_PROMPT, settings)
      const json = raw.match(/\{[\s\S]*\}/)?.[0]
      if (!json) throw new Error('無法解析 AI 回傳結果')
      const data = JSON.parse(json)
      data.rooms = data.rooms.map((r, i) => ({ ...r, color: r.color || ROOM_COLORS[i % ROOM_COLORS.length] }))
      setResult(data)
    } catch (e) {
      setError(e.message === 'NO_CONFIG' ? '請先在設定中填入 API 端點與 Key' : `分析失敗：${e.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const hasConfig = !!(settings?.apiKey || settings?.geminiApiKey)

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <h2>格局分析</h2>
          <p className="page-subtitle">上傳平面圖，AI 幫你解析空間</p>
        </div>
      </div>

      {/* Upload */}
      <div
        className={`upload-zone${image ? '' : ''}`}
        style={{ marginBottom: 16, padding: image ? 0 : 32, border: image ? 'none' : undefined, overflow: 'hidden', borderRadius: 'var(--r-lg)' }}
        onClick={() => !image && fileRef.current.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {image ? (
          <div style={{ position: 'relative' }}>
            <img src={image} alt="平面圖" style={{ width: '100%', borderRadius: 'var(--r-lg)', maxHeight: 300, objectFit: 'contain', background: 'var(--bg-2)' }} />
            <button className="btn btn-sm btn-ghost" onClick={e => { e.stopPropagation(); setImage(null); setResult(null) }}
              style={{ position: 'absolute', top: 8, right: 8 }}>更換</button>
          </div>
        ) : (
          <>
            <Upload size={28} style={{ margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>上傳平面圖或戶型圖</div>
            <div style={{ fontSize: 13 }}>支援 JPG / PNG / 手繪拍照</div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* Analyze button */}
      {image && (
        <button
          className="btn btn-primary btn-block"
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{ marginBottom: 16 }}
        >
          {analyzing
            ? <><span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span> AI 分析中...</>
            : <><Sparkles size={16} /> AI 格局分析</>}
        </button>
      )}

      {!hasConfig && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(212,168,83,0.3)', background: 'rgba(212,168,83,0.06)' }}>
          <div style={{ fontSize: 14, color: 'var(--c-gold)' }}>💡 設定 AI Key 後可啟用智慧格局分析功能</div>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(224,112,112,0.3)', background: 'rgba(224,112,112,0.06)' }}>
          <div style={{ fontSize: 14, color: 'var(--c-red)' }}>⚠️ {error}</div>
        </div>
      )}

      {/* Result */}
      {result && <AnalysisResult result={result} image={image} settings={settings} />}

      {/* External tools */}
      <div className="divider" />
      <div className="section-title">想要完整 3D？試試免費工具</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {EXTERNAL_TOOLS.map(t => (
          <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer"
            className="card clickable" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.desc}</div>
            </div>
            <ExternalLink size={16} color="var(--text-3)" />
          </a>
        ))}
      </div>
    </div>
  )
}

function AnalysisResult({ result, image, settings }) {
  const total = result.rooms.reduce((s, r) => s + (r.area || 0), 0) || 1
  const [generating, setGenerating] = useState(false)
  const [genImage, setGenImage] = useState(null)
  const [genError, setGenError] = useState(null)
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [activeStyleName, setActiveStyleName] = useState(null)

  const buildStylePrompt = (style) => {
    const rooms = result.rooms?.map(r => r.name).join('、') || '客廳'
    return [
      `Redesign this exact room as ${style.name} style interior.`,
      `CRITICAL: Keep the EXACT same camera angle, perspective, viewpoint, room shape and structure, window and door positions as the original photo.`,
      `MUST redesign everything else: furniture, decor, wall color/texture, flooring material, CEILING design, lighting fixtures, and soft furnishings.`,
      `Ceiling: completely redesign the ceiling to match the style — ${style.ceiling || 'a ceiling treatment that fits the style, with new lighting fixtures'}. Do NOT keep the original plain ceiling.`,
      `If the original room is empty, bare or unfurnished, treat this as virtual staging: fully furnish and decorate the space with a complete set of furniture, rugs, curtains, lighting and decor in this style. Do not leave the room empty.`,
      `Style details: ${style.prompt}`,
      `Room context: ${rooms}, approximately ${result.totalArea || 30} 坪.`,
      `Output: photorealistic interior design rendering, same composition as input photo.`,
    ].join(' ')
  }

  const handleGenerate = async (prompt, styleName) => {
    if (!image || !settings?.apiKey) return
    setGenerating(true); setGenError(null); setActiveStyleName(styleName || '自訂')
    try {
      const results = await editImage(image, prompt, settings)
      if (results.length > 0) setGenImage(results[0])
    } catch (e) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleStyleClick = (style) => {
    if (generating) return
    setSelectedStyle(s => s?.id === style.id ? null : style)
    setShowCustom(false)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-title">AI 分析結果</div>

      {/* Room visual breakdown */}
      <div style={{ display: 'flex', borderRadius: 'var(--r-md)', overflow: 'hidden', height: 40, marginBottom: 16 }}>
        {result.rooms.map(r => (
          <div key={r.name} title={r.name}
            style={{ flex: r.area / total, background: r.color, minWidth: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(r.area / total) > 0.12 && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.7)' }}>{r.name}</span>}
          </div>
        ))}
      </div>

      {/* Summary card */}
      <div className="card" style={{ marginBottom: 12, borderColor: 'var(--c-gold-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>格局摘要</span>
          <span className="chip chip-gold">約 {result.totalArea} 坪</span>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>{result.summary}</p>
      </div>

      {/* Rooms */}
      <div className="section-title">房間分布</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {result.rooms.map(r => (
          <div key={r.name} className="card" style={{ padding: '12px 14px', borderLeft: `3px solid ${r.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</span>
              <span className="chip chip-muted">{r.area} 坪</span>
            </div>
            {r.features?.length > 0 && (
              <div className="tags" style={{ marginTop: 6 }}>
                {r.features.map(f => <span key={f} className="chip chip-muted" style={{ fontSize: 11, padding: '2px 8px' }}>{f}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Strengths & Issues */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="section-title" style={{ color: 'var(--c-green)' }}>優點</div>
          {result.strengths?.map((s, i) => <div key={i} style={{ fontSize: 13, color: 'var(--c-green)', marginTop: 4 }}>✓ {s}</div>)}
        </div>
        <div className="card">
          <div className="section-title" style={{ color: 'var(--c-red)' }}>注意</div>
          {result.issues?.map((s, i) => <div key={i} style={{ fontSize: 13, color: 'var(--c-red)', marginTop: 4 }}>⚠ {s}</div>)}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, transition: 'all 0.3s ease' }}>
        <div>
          <div className="section-title">
            {selectedStyle ? '選擇風格' : '推薦風格'}
          </div>
          <div style={{ fontWeight: 600, color: selectedStyle ? 'var(--c-gold)' : 'var(--c-purple)', transition: 'color 0.3s' }}>
            {selectedStyle ? `${selectedStyle.emoji} ${selectedStyle.name}` : result.style}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="section-title">估計預算</div>
          <div style={{ fontWeight: 600, color: 'var(--c-gold)', transition: 'all 0.3s' }}>
            {selectedStyle ? estimateBudget(selectedStyle, result.totalArea) : result.estimatedBudget}
          </div>
          {selectedStyle && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              {selectedStyle.costPerPing[0]}-{selectedStyle.costPerPing[1]}萬/坪
            </div>
          )}
        </div>
      </div>

      {/* Style Picker + Image Generation */}
      {image && settings?.apiKey && (
        <>
          <div className="divider" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Wand2 size={18} color="var(--c-gold)" />
            <span style={{ fontWeight: 700, fontSize: 16 }}>選擇風格，AI 幫你改造</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
            點選喜歡的風格，一鍵生成改造後效果圖
          </p>

          {/* Style grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {DESIGN_STYLES.map(style => {
              const isSelected = selectedStyle?.id === style.id
              const isRecommended = result.style && style.name.includes(result.style.replace(/風$/, ''))
              return (
                <button key={style.id} className="card clickable"
                  onClick={() => handleStyleClick(style)}
                  disabled={generating}
                  style={{
                    textAlign: 'left', padding: '12px',
                    borderColor: isSelected ? 'var(--c-gold)' : undefined,
                    background: isSelected ? 'var(--c-gold-muted)' : undefined,
                    boxShadow: isSelected ? '0 0 0 1px var(--c-gold)' : undefined,
                    opacity: generating ? 0.6 : 1,
                    position: 'relative',
                  }}>
                  {isRecommended && (
                    <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, background: 'var(--c-purple)', color: 'white', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>推薦</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{style.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{style.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.4 }}>{style.desc}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {style.palette.map(c => (
                      <div key={c} style={{ flex: 1, height: 6, background: c, borderRadius: 3 }} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Generate button for selected style */}
          {selectedStyle && !showCustom && (
            <button className="btn btn-primary btn-block"
              onClick={() => handleGenerate(buildStylePrompt(selectedStyle), selectedStyle.name)}
              disabled={generating}
              style={{ marginBottom: 10 }}>
              {generating
                ? <><span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span> 生成「{selectedStyle.name}」中...</>
                : <><Wand2 size={14} /> 生成「{selectedStyle.name}」改造圖</>}
            </button>
          )}

          {/* Custom prompt toggle */}
          {!showCustom ? (
            <button className="btn btn-ghost btn-sm btn-block"
              onClick={() => { setShowCustom(true); setSelectedStyle(null) }}
              disabled={generating}
              style={{ marginBottom: 10 }}>
              ✏️ 自訂改造描述
            </button>
          ) : (
            <div className="card" style={{ marginBottom: 10, borderColor: 'var(--c-gold-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>自訂改造描述</div>
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="例如：改為日式無印風格，加入木質家具和暖色燈光，窗邊放一張閱讀椅..."
                style={{
                  width: '100%', minHeight: 70, padding: '10px 12px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)', color: 'var(--text-1)', fontSize: 14,
                  lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit',
                  outline: 'none', marginBottom: 8, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  onClick={() => handleGenerate(customPrompt, null)}
                  disabled={generating || !customPrompt.trim()}>
                  {generating
                    ? <><span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span> 生成中...</>
                    : <><Wand2 size={14} /> 生成改造圖</>}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowCustom(false)} disabled={generating}>取消</button>
              </div>
            </div>
          )}

          {genError && (
            <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--c-red)', padding: '8px 12px', background: 'rgba(224,112,112,0.06)', borderRadius: 'var(--r-sm)' }}>
              ⚠️ {genError}
            </div>
          )}

          {/* Before / After comparison */}
          {genImage && (
            <div className="card gold-border" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="section-title" style={{ margin: 0 }}>改造對比</div>
                {activeStyleName && <span className="chip chip-gold" style={{ fontSize: 11 }}>{activeStyleName}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textAlign: 'center' }}>原始照片</div>
                  <img src={image} alt="原始" style={{ width: '100%', borderRadius: 'var(--r-md)', aspectRatio: '1', objectFit: 'cover', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-gold)', marginBottom: 4, textAlign: 'center' }}>AI 改造</div>
                  <img src={genImage} alt="改造後" style={{ width: '100%', borderRadius: 'var(--r-md)', aspectRatio: '1', objectFit: 'cover', border: '1px solid var(--c-gold-border)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={() => {
                    const p = selectedStyle ? buildStylePrompt(selectedStyle) : customPrompt
                    handleGenerate(p, activeStyleName)
                  }} disabled={generating}>
                  <RefreshCw size={14} /> 重新生成
                </button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={() => { setGenImage(null); setSelectedStyle(null); setActiveStyleName(null) }}>
                  換個風格
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
