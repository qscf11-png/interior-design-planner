import { useState, useCallback } from 'react'
import { Home, Building2, LayoutGrid, Palette, Wallet, Settings, Sparkles, X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ChevronDown, LogIn, LogOut, User, Images } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import FloorPlan from './pages/FloorPlan'
import StyleBoard from './pages/StyleBoard'
import Budget from './pages/Budget'
import AiAdvisor from './components/AiAdvisor'
import FavoritesGallery from './components/FavoritesGallery'
import { getSettings, saveSettings } from './lib/db'
import { validateGaisfKey, validateGeminiKey, GAISF_MODELS, GEMINI_MODELS_DEFAULT, PROVIDERS } from './lib/gaisf'
import { useAuth } from './hooks/useAuth'
import { signInWithGoogle, logOut } from './lib/auth'

const TABS = [
  { id: 'dashboard', label: '首頁',  icon: Home },
  { id: 'properties', label: '物件', icon: Building2 },
  { id: 'floorplan',  label: '格局', icon: LayoutGrid },
  { id: 'style',      label: '風格', icon: Palette },
  { id: 'budget',     label: '預算', icon: Wallet },
]

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const [showAdvisor, setShowAdvisor] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [settings, setSettings] = useState(() => getSettings())

  const handleSaveSettings = (s) => {
    saveSettings(s)
    setSettings(s)
  }

  const handleLogin = async () => {
    try { await signInWithGoogle() } catch (e) { alert(e.message) }
  }

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>載入中...</div>
        </div>
      </div>
    )
  }

  const pages = {
    dashboard:  <Dashboard settings={settings} onTabChange={setTab} />,
    properties: <Properties />,
    floorplan:  <FloorPlan settings={settings} />,
    style:      <StyleBoard settings={settings} />,
    budget:     <Budget />,
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-brand-icon">🏠</span>
          <span>{settings.projectName || '室內設計規劃'}</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowFavorites(true)} title="設計收藏">
            <Images size={20} />
          </button>
          {user ? (
            <>
              <button className="icon-btn" onClick={() => setShowSettings(true)} title="設定">
                <Settings size={20} />
              </button>
              <button className="icon-btn" onClick={logOut} title={`登出 ${user.displayName || ''}`}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} referrerPolicy="no-referrer" />
                  : <User size={20} />}
              </button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={handleLogin}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <LogIn size={16} /> 登入
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {pages[tab]}
      </main>

      <nav className="app-nav">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <button className="ai-fab" onClick={() => setShowAdvisor(true)} title="AI 設計顧問">
        <Sparkles size={22} />
      </button>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <AiAdvisor
        isOpen={showAdvisor}
        onClose={() => setShowAdvisor(false)}
        settings={settings}
      />

      {showFavorites && <FavoritesGallery onClose={() => setShowFavorites(false)} />}
    </div>
  )
}

function SettingsModal({ settings, onSave, onClose }) {
  const [form, setForm] = useState({ ...settings })
  const [showKey, setShowKey] = useState(false)
  const [verifyState, setVerifyState] = useState(null)
  const [activeTab, setActiveTab] = useState(form.provider || PROVIDERS.GAISF)
  const [geminiModels, setGeminiModels] = useState(form.geminiModelsCache || GEMINI_MODELS_DEFAULT)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleVerify = useCallback(async () => {
    if (activeTab === PROVIDERS.GEMINI) {
      const key = form.geminiApiKey
      if (!key) { setVerifyState({ ok: false, msg: '請先填入 Gemini API Key' }); return }
      setVerifyState({ ok: null, msg: '驗證中...' })
      try {
        const result = await validateGeminiKey(key, form.geminiModel || 'gemini-2.5-flash')
        if (result.valid) {
          setGeminiModels(result.models)
          set('geminiModelsCache', result.models)
          if (!form.geminiModel && result.models.length) set('geminiModel', result.models[0].id)
          setVerifyState({ ok: true, msg: `連線成功！${result.models.length} 個可用模型` })
        } else {
          setVerifyState({ ok: false, msg: `驗證失敗：${result.error}` })
        }
      } catch (e) {
        setVerifyState({ ok: false, msg: `連線失敗：${e.message}` })
      }
    } else {
      const key = form.apiKey
      if (!key) { setVerifyState({ ok: false, msg: '請先填入達哥 GAISF API Key' }); return }
      setVerifyState({ ok: null, msg: '驗證中...' })
      try {
        const result = await validateGaisfKey(key)
        if (result.valid) {
          if (!form.model) set('model', 'gpt-4o-mini')
          setVerifyState({ ok: true, msg: `連線成功！${result.models.length} 個可用模型` })
        } else {
          setVerifyState({ ok: false, msg: `驗證失敗：${result.error}` })
        }
      } catch (e) {
        setVerifyState({ ok: false, msg: `連線失敗：${e.message}` })
      }
    }
  }, [activeTab, form.apiKey, form.geminiApiKey])

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    set('provider', tab)
    setVerifyState(null)
  }

  const handleSave = () => {
    onSave({ ...form, provider: activeTab })
    onClose()
  }

  const providerTabs = [
    { id: PROVIDERS.GAISF, label: '達哥 GAISF', color: '#5cba9d' },
    { id: PROVIDERS.GEMINI, label: 'Gemini', color: '#60a5fa' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>⚙️ 設定</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">🏠 專案名稱</label>
            <input className="form-input" value={form.projectName || ''} placeholder="我的新家"
              onChange={e => set('projectName', e.target.value)} />
          </div>

          <div className="divider" />

          {/* Provider tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {providerTabs.map(t => (
              <button key={t.id}
                onClick={() => handleTabSwitch(t.id)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: activeTab === t.id ? t.color : 'var(--bg-2)',
                  color: activeTab === t.id ? 'white' : 'var(--text-3)',
                  transition: 'all 0.2s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === PROVIDERS.GAISF ? (
            <>
              <div className="form-group">
                <label className="form-label">API Key（達哥 JWT 金鑰）</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showKey ? 'text' : 'password'}
                    value={form.apiKey || ''} placeholder="貼上達哥平台取得的 API Key..."
                    onChange={e => { set('apiKey', e.target.value); setVerifyState(null) }}
                    style={{ paddingRight: 40 }} />
                  <button onClick={() => setShowKey(v => !v)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">選擇模型</label>
                <div style={{ position: 'relative' }}>
                  <select className="form-select" value={form.model || 'gpt-4o-mini'}
                    onChange={e => set('model', e.target.value)} style={{ paddingRight: 32 }}>
                    {GAISF_MODELS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
                圖片生成使用 Nanobanana（Gemini）模型，與對話模型共用同一組 Key
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Gemini API Key</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showKey ? 'text' : 'password'}
                    value={form.geminiApiKey || ''} placeholder="貼上 Google AI Studio 取得的 API Key..."
                    onChange={e => { set('geminiApiKey', e.target.value); setVerifyState(null) }}
                    style={{ paddingRight: 40 }} />
                  <button onClick={() => setShowKey(v => !v)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  至 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-gold)' }}>Google AI Studio</a> 免費取得
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">選擇模型</label>
                <div style={{ position: 'relative' }}>
                  <select className="form-select" value={form.geminiModel || 'gemini-2.5-flash'}
                    onChange={e => set('geminiModel', e.target.value)} style={{ paddingRight: 32 }}>
                    {geminiModels.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
                圖片生成使用 Gemini Image Generation 模型，免費額度即可使用
              </div>
            </>
          )}

          {/* Verify button */}
          <button
            className="btn btn-block"
            onClick={handleVerify}
            disabled={verifyState?.ok === null}
            style={{
              marginTop: 14,
              background: verifyState?.ok === true ? 'rgba(45,157,120,0.1)' : verifyState?.ok === false ? 'rgba(208,64,64,0.06)' : 'var(--bg-glass)',
              color: verifyState?.ok === true ? 'var(--c-green)' : verifyState?.ok === false ? 'var(--c-red)' : 'var(--text-1)',
              border: `1px solid ${verifyState?.ok === true ? 'rgba(45,157,120,0.25)' : verifyState?.ok === false ? 'rgba(208,64,64,0.2)' : 'var(--border)'}`,
            }}
          >
            {verifyState?.ok === null
              ? <><Loader2 size={16} className="animate-spin" /> 驗證中...</>
              : verifyState?.ok === true
                ? <><CheckCircle2 size={16} /> {verifyState.msg}</>
                : verifyState?.ok === false
                  ? <><AlertCircle size={16} /> {verifyState.msg}</>
                  : `🔗 驗證 ${activeTab === PROVIDERS.GEMINI ? 'Gemini' : 'GAISF'} 連線`}
          </button>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>儲存設定</button>
        </div>
      </div>
    </div>
  )
}
