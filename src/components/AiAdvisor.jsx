import { useState, useRef, useEffect } from 'react'
import { X, Send, Image, Sparkles } from 'lucide-react'
import { streamChat, compressImage } from '../lib/gaisf'

export default function AiAdvisor({ isOpen, onClose, settings }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是你的 AI 室內設計顧問 🏠\n\n可以問我任何關於設計、建材、格局、採購的問題。也可以傳圖片讓我分析！' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState(null)
  const bottomRef = useRef()
  const inputRef = useRef()
  const fileRef = useRef()

  useEffect(() => {
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 300) }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasConfig = !!(settings?.apiKey || settings?.geminiApiKey)

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      // 壓縮圖片以符合 API 傳輸限制
      const compressed = await compressImage(ev.target.result).catch(() => ev.target.result)
      setImage(compressed)
    }
    reader.readAsDataURL(file)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text && !image) return
    if (!hasConfig) { setMessages(m => [...m, { role: 'assistant', content: '⚙️ 請先在右上角設定 AI API Key 才能使用對話功能。' }]); return }

    const userMsg = { role: 'user', content: text || '（請分析這張圖片）', image }
    setMessages(m => [...m, userMsg])
    setInput(''); setImage(null); setLoading(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(m => [...m, assistantMsg])

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const stream = streamChat(history, settings, userMsg.image || null)
      let full = ''
      for await (const chunk of stream) {
        full += chunk
        setMessages(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, content: full } : msg))
      }
    } catch (e) {
      const errText = e.message === 'NO_CONFIG'
        ? '⚙️ 請先設定 API Key。'
        : `❌ 錯誤：${e.message}`
      setMessages(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, content: errText } : msg))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ height: '80dvh', maxWidth: 600, borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--c-gold), var(--c-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>AI 設計顧問</div>
              {!hasConfig && <div style={{ fontSize: 12, color: 'var(--c-red)' }}>需要設定 API Key</div>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12, '-webkit-overflow-scrolling': 'touch' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.image && (
                <img src={msg.image} style={{ maxWidth: 200, borderRadius: 'var(--r-md)', marginBottom: 4, border: '1px solid var(--border)' }} />
              )}
              <div style={{
                maxWidth: '85%', padding: '10px 14px',
                borderRadius: msg.role === 'user' ? 'var(--r-lg) var(--r-lg) 4px var(--r-lg)' : 'var(--r-lg) var(--r-lg) var(--r-lg) 4px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, var(--c-gold), #c9a24a)' : '#f0f0f3',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                fontSize: 14, lineHeight: 1.65,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.content || (loading && i === messages.length - 1 ? (
                  <span className="loading-dots"><span /><span /><span /></span>
                ) : '')}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Preview attached image */}
        {image && (
          <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={image} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--c-gold-border)' }} />
            <button style={{ color: 'var(--c-red)', fontSize: 20 }} onClick={() => setImage(null)}>✕</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button className="icon-btn btn-icon" onClick={() => fileRef.current.click()} style={{ flexShrink: 0, color: image ? 'var(--c-gold)' : 'var(--text-3)' }} title="傳送圖片">
            <Image size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="問我任何室內設計問題..."
            style={{
              flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '10px 12px', color: 'var(--text-1)',
              fontSize: 14, resize: 'none', maxHeight: 100, lineHeight: 1.5,
              outline: 'none', fontFamily: 'inherit', minHeight: 42,
            }}
            rows={1}
          />
          <button
            className="btn btn-primary btn-icon"
            onClick={handleSend}
            disabled={loading || (!input.trim() && !image)}
            style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 'var(--r-md)' }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
