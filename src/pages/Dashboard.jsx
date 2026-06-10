import { useState } from 'react'
import { Building2, LayoutGrid, Palette, Wallet, ChevronRight, CheckCircle2 } from 'lucide-react'
import { getProperties, getStyleData, getBudget } from '../lib/db'

const PHASES = [
  { id: 1, icon: '🔍', label: '看房選物件' },
  { id: 2, icon: '✅', label: '確定物件' },
  { id: 3, icon: '📐', label: '格局規劃' },
  { id: 4, icon: '🎨', label: '風格採購' },
  { id: 5, icon: '🏗️', label: '施工完工' },
]

const TIPS = [
  '🏠 看房時記得測量各房間尺寸，拍下每個角落的照片。',
  '💡 確認採光方向，南向優先，西曬注意遮陽規劃。',
  '🚰 查看水電箱位置，判斷是否需要重新配管。',
  '📏 確認樑柱位置，高度較低的地方考慮收納設計。',
  '🏢 了解管委會規定，確認裝修許可及時段限制。',
]

export default function Dashboard({ settings, onTabChange }) {
  const properties = getProperties()
  const styleData = getStyleData()
  const budget = getBudget()
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  const tip = TIPS[new Date().getDay() % TIPS.length]
  const currentPhase = 1

  const quickActions = [
    { label: '新增看屋物件', icon: Building2, color: 'var(--c-gold)', tab: 'properties' },
    { label: '上傳平面圖分析', icon: LayoutGrid, color: 'var(--c-purple)', tab: 'floorplan' },
    { label: '開始風格探索', icon: Palette, color: 'var(--c-green)', tab: 'style' },
    { label: '設定裝修預算', icon: Wallet, color: 'var(--c-blue)', tab: 'budget' },
  ]

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>{today}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          {settings.projectName ? `${settings.projectName} 🏠` : '歡迎回來 🏠'}
        </h1>
        <p className="page-subtitle">你的室內設計規劃中心</p>
      </div>

      {/* Phase Progress */}
      <div className="card gold-border" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="section-title" style={{ margin: 0 }}>規劃進度</span>
          <span className="chip chip-gold">第 {currentPhase} / 5 階段</span>
        </div>
        <div className="phases">
          {PHASES.map(p => (
            <div key={p.id} className={`phase-step${p.id === currentPhase ? ' current' : p.id < currentPhase ? ' done' : ''}`}>
              <div className="phase-dot">
                {p.id < currentPhase ? <CheckCircle2 size={16} /> : p.icon}
              </div>
              <span className="phase-label">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value text-gold">{properties.length}</div>
          <div className="stat-label">已記錄物件</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--c-purple)' }}>
            {styleData.styleResult ? '✓' : '—'}
          </div>
          <div className="stat-label">風格已定義</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green">
            {budget.total > 0 ? `${(budget.total / 10000).toFixed(0)}萬` : '—'}
          </div>
          <div className="stat-label">裝修預算</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--c-blue)' }}>
            {properties.filter(p => p.rating >= 4).length}
          </div>
          <div className="stat-label">高評分物件</div>
        </div>
      </div>

      {/* Today's Tip */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--c-gold)' }}>
        <div className="section-title" style={{ marginBottom: 8 }}>今日小知識</div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>{tip}</p>
      </div>

      {/* Quick Actions */}
      <div className="section-title">快速入口</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {quickActions.map(({ label, icon: Icon, color, tab }) => (
          <button
            key={tab}
            className="card clickable"
            onClick={() => onTabChange(tab)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '14px 16px' }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--r-md)',
              background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon size={20} color={color} />
            </div>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{label}</span>
            <ChevronRight size={18} color="var(--text-3)" />
          </button>
        ))}
      </div>

      {/* External Tools */}
      <div className="divider" />
      <div className="section-title">免費 3D 工具推薦</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { name: 'Planner 5D', url: 'https://planner5d.com/ai', desc: '平面圖辨識→3D' },
          { name: 'Pixelcut', url: 'https://www.pixelcut.ai/create/convert-2d-plan-to-3d', desc: '2D 圖轉 3D 渲染' },
          { name: 'RoomsGPT', url: 'https://www.roomsgpt.io', desc: '空房照片風格預覽' },
        ].map(t => (
          <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer"
            className="card"
            style={{ flex: '1 1 140px', textDecoration: 'none', padding: '12px 14px' }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
