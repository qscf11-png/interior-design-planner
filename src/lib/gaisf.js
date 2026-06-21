const SYSTEM = `你是一位專業的室內設計顧問，協助用戶規劃新家的室內設計。
你熟悉台灣建材行情、設計趨勢及施工知識。
請用繁體中文回答，語氣親切、專業。若收到圖片，請仔細分析並提供具體建議。`

// ─── Provider Constants ───
export const PROVIDERS = { GAISF: 'gaisf', GEMINI: 'gemini' }

// ─── GAISF (達哥) ───
// 本機開發走 Vite dev proxy；GitHub Pages 等生產環境走 Vercel 反向代理
// （GAISF 端點不回 CORS headers，瀏覽器無法直連）
const GAISF_LOCAL_PROXY = '/api/gaisf'
const GAISF_VERCEL_PROXY = 'https://twse-proxy.vercel.app/api/gaisf'
const isProduction = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)

// 組合 GAISF 端點 URL（自動偵測環境）
function gaisfEndpoint(deployPath, apiVersion = null) {
  if (isProduction) {
    const qs = apiVersion ? `&api-version=${apiVersion}` : ''
    return `${GAISF_VERCEL_PROXY}?path=${encodeURIComponent(deployPath)}${qs}`
  }
  const qs = apiVersion ? `?api-version=${apiVersion}` : ''
  return `${GAISF_LOCAL_PROXY}${deployPath}${qs}`
}

export const GAISF_MODELS = [
  { id: 'gpt-4o-mini',                name: 'GPT-4o Mini',           apiVersion: '2024-10-21' },
  { id: 'gpt-4o',                     name: 'GPT-4o',                apiVersion: '2025-03-01-preview' },
  { id: 'gpt-4-1',                    name: 'GPT-4.1',               apiVersion: '2025-01-01-preview' },
  { id: 'gpt-4-1-mini',               name: 'GPT-4.1 Mini',          apiVersion: '2025-01-01-preview' },
  { id: 'gpt-5-mini',                 name: 'GPT-5 Mini',            apiVersion: '2025-04-01-preview' },
  { id: 'gpt-5-nano',                 name: 'GPT-5 Nano',            apiVersion: '2025-04-01-preview' },
  { id: 'gpt-o3-mini',                name: 'GPT o3-mini',           apiVersion: '2024-12-01-preview' },
  { id: 'deepseek-r1-0528',           name: 'DeepSeek R1',           apiVersion: '2024-10-21' },
  { id: 'deepseek-v3-2',              name: 'DeepSeek V3',           apiVersion: '2024-05-01-preview' },
  { id: 'gemini-3-flash',             name: 'Gemini 3 Flash',        apiVersion: '2024-10-21' },
  { id: 'grok-4-1-fast-reasoning',    name: 'Grok 4 Fast',           apiVersion: '2024-05-01-preview' },
  { id: 'kimi-k2-thinking',           name: 'Kimi K2 Thinking',      apiVersion: '2024-10-21' },
]

export const IMAGE_MODELS = [
  { id: 'nanobanana', name: 'Nanobanana (Gemini)', supportsEdit: true },
  { id: 'Dalle3',     name: 'DALL-E 3',            supportsEdit: false },
  { id: 'image-1',    name: 'GPT Image-1',         supportsEdit: false },
]

// ─── Gemini Direct ───
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// 生圖模型偏好序（新→舊）；實際以 API 動態查詢為準，全部失敗才逐一嘗試此清單
const GEMINI_IMAGE_MODELS_PREFERRED = [
  'gemini-3.1-flash-image',                    // Nano Banana 2（2026 現役）
  'gemini-2.5-flash-image',                    // Nano Banana（2026/10 退役）
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation', // 已淘汰，保留為最後備援
]

// 已解析的生圖模型快取（依 Key 區分，換 Key 時重新偵測）
let imageModelCache = { key: null, model: null }

// 動態查詢此 Key 可用的生圖模型（名稱含 image 且支援 generateContent）
async function resolveGeminiImageModel(apiKey) {
  if (imageModelCache.key === apiKey && imageModelCache.model) return imageModelCache.model
  try {
    const res = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`)
    if (!res.ok) return null
    const data = await res.json()
    const imageModels = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .filter(id => id.includes('image'))
    // 先依偏好序挑，沒有命中就拿 API 回傳的第一個生圖模型
    const picked = GEMINI_IMAGE_MODELS_PREFERRED.find(p => imageModels.includes(p)) || imageModels[0] || null
    if (picked) imageModelCache = { key: apiKey, model: picked }
    return picked
  } catch {
    return null
  }
}

export const GEMINI_MODELS_DEFAULT = [
  { id: 'gemini-2.5-flash',  name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro',    name: 'Gemini 2.5 Pro' },
]

export async function fetchGeminiModels(apiKey) {
  const res = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`)
  if (!res.ok) return GEMINI_MODELS_DEFAULT
  const data = await res.json()
  return (data.models || [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => ({
      id: m.name.replace('models/', ''),
      name: m.displayName || m.name.replace('models/', ''),
    }))
    .sort((a, b) => {
      const order = (id) => {
        if (id.includes('2.5-pro')) return 0
        if (id.includes('2.5-flash')) return 1
        if (id.includes('pro')) return 2
        if (id.includes('flash')) return 3
        return 5
      }
      return order(a.id) - order(b.id)
    })
}

// ─── Helpers ───
function dataUrlToBase64Parts(dataUrl) {
  const [header, base64Data] = dataUrl.split(',')
  const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
  return { base64: base64Data, mimeType }
}

function extractImagesFromCandidates(data) {
  const images = []
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/jpeg'
        images.push(`data:${mime};base64,${part.inlineData.data}`)
      }
    }
  }
  return images
}

function getApiVersion(modelId) {
  return GAISF_MODELS.find(m => m.id === modelId)?.apiVersion || '2024-10-21'
}

function buildGaisfUrl(modelId, apiVersion) {
  return gaisfEndpoint(`/openai/deployments/${modelId}/chat/completions`, apiVersion)
}

function isGemini(settings) {
  return settings?.provider === PROVIDERS.GEMINI
}

function getKey(settings) {
  if (isGemini(settings)) return settings.geminiApiKey
  return settings.apiKey
}

// ─── Validate ───
export async function validateGaisfKey(apiKey) {
  try {
    const url = buildGaisfUrl('gpt-4o-mini', '2024-10-21')
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
    })
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '')
      if (resp.status === 401 || resp.status === 403) return { valid: false, error: 'API Key 無效或權限不足' }
      throw new Error(`HTTP ${resp.status}: ${errBody.substring(0, 100)}`)
    }
    return { valid: true, models: GAISF_MODELS }
  } catch (error) {
    return { valid: false, error: error.message || 'GAISF Key 驗證失敗' }
  }
}

export async function validateGeminiKey(apiKey, model = 'gemini-2.5-flash') {
  try {
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }], generationConfig: { maxOutputTokens: 5 } }),
    })
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      if (resp.status === 400 && txt.includes('API_KEY')) return { valid: false, error: 'Gemini API Key 無效' }
      if (resp.status === 403) return { valid: false, error: 'Gemini API Key 權限不足' }
      if (resp.status === 404) return { valid: false, error: `模型 ${model} 不可用，請確認 API Key 權限` }
      throw new Error(`HTTP ${resp.status}: ${txt.substring(0, 100)}`)
    }
    const models = await fetchGeminiModels(apiKey)
    return { valid: true, models }
  } catch (error) {
    return { valid: false, error: error.message || 'Gemini Key 驗證失敗' }
  }
}

// ─── Chat (unified, async generator) ───
export async function* streamChat(messages, settings, imageBase64 = null) {
  const key = getKey(settings)
  if (!key) throw new Error('NO_CONFIG')

  if (isGemini(settings)) {
    yield await geminiChat(messages, settings, imageBase64)
    return
  }

  const model = settings.model || 'gpt-4o-mini'
  const apiVersion = getApiVersion(model)
  const url = buildGaisfUrl(model, apiVersion)

  const last = messages[messages.length - 1]
  const userContent = imageBase64
    ? [
        { type: 'text', text: last.content },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ]
    : last.content

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      max_tokens: 2048,
      messages: [
        { role: 'system', content: SYSTEM },
        ...messages.slice(0, -1),
        { role: 'user', content: userContent }
      ]
    })
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) throw new Error('API Key 無效或權限不足')
    if (res.status === 404) throw new Error(`模型 ${model} 不可用，請切換其他模型`)
    if (res.status === 429) throw new Error('配額超限，請稍候再試')
    throw new Error(`GAISF HTTP ${res.status}: ${txt.substring(0, 100)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  if (content) yield content
}

// 純文字問答（彙整 streamChat 串流為完整字串，自動走 GAISF / Gemini）
export async function askText(prompt, settings) {
  const out = []
  for await (const chunk of streamChat([{ role: 'user', content: prompt }], settings)) {
    out.push(chunk)
  }
  return out.join('')
}

async function geminiChat(messages, settings, imageBase64 = null) {
  const key = settings.geminiApiKey
  const model = settings.geminiModel || 'gemini-2.5-flash'

  const contents = []
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    contents.push({ role, parts: [{ text: m.content }] })
  }

  if (imageBase64) {
    const last = contents[contents.length - 1]
    const { base64, mimeType } = dataUrlToBase64Parts(imageBase64)
    last.parts.push({ inlineData: { mimeType, data: base64 } })
  }

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { maxOutputTokens: 2048 },
    })
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    if (res.status === 400 || res.status === 403) throw new Error('Gemini API Key 無效或權限不足')
    if (res.status === 429) throw new Error('配額超限，請稍候再試')
    throw new Error(`Gemini HTTP ${res.status}: ${txt.substring(0, 150)}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts
    ?.filter(p => p.text)
    .map(p => p.text)
    .join('') || ''
}

// ─── Image Analysis (unified) ───
export async function analyzeImage(imageBase64, prompt, settings) {
  const key = getKey(settings)
  if (!key) throw new Error('NO_CONFIG')

  if (isGemini(settings)) {
    return geminiAnalyze(imageBase64, prompt, settings)
  }

  const model = settings.model || 'gpt-4o'
  const apiVersion = getApiVersion(model)
  const url = buildGaisfUrl(model, apiVersion)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      }]
    })
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error(`模型 ${model} 不支援圖片分析，請切換 GPT-4o`)
    throw new Error(`GAISF HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function geminiAnalyze(imageBase64, prompt, settings) {
  const key = settings.geminiApiKey
  const model = settings.geminiModel || 'gemini-2.5-flash'
  const { base64, mimeType } = dataUrlToBase64Parts(imageBase64)

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } }
        ]
      }],
      generationConfig: { maxOutputTokens: 3000 },
    })
  })

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts
    ?.filter(p => p.text)
    .map(p => p.text)
    .join('') || ''
}

// ─── Image Editing (unified) ───
export async function editImage(imageDataUrl, prompt, settings) {
  const key = getKey(settings)
  if (!key) throw new Error('NO_CONFIG')

  if (isGemini(settings)) {
    return geminiEditImage(imageDataUrl, prompt, settings.geminiApiKey)
  }
  return editImageNanobanana(imageDataUrl, prompt, settings.apiKey)
}

async function editImageNanobanana(imageDataUrl, prompt, apiKey, n = 1) {
  // Nanobanana 不需要 api-version 參數
  const url = gaisfEndpoint('/openai/deployments/nanobanana/images/generations')
  const { base64, mimeType } = dataUrlToBase64Parts(imageDataUrl)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({
      prompt,
      n: Math.min(n, 4),
      size: '1024x1024',
      response_format: 'b64_json',
      images: [{ base64, mimeType }],
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    if (res.status === 404) throw new Error('Nanobanana 模型不可用')
    if (res.status === 429) throw new Error('配額超限，請稍候再試')
    throw new Error(`Nanobanana HTTP ${res.status}: ${txt.substring(0, 100)}`)
  }

  const data = await res.json()
  const fromCandidates = extractImagesFromCandidates(data)
  if (fromCandidates.length > 0) return fromCandidates

  if (data.data?.length) {
    return data.data.map(img => `data:image/png;base64,${img.b64_json || img.url}`)
  }

  throw new Error('Nanobanana 回傳無圖片資料')
}

async function geminiEditImage(imageDataUrl, prompt, apiKey) {
  const { base64, mimeType } = dataUrlToBase64Parts(imageDataUrl)

  // 先動態偵測可用模型，再附上偏好清單作為備援，逐一嘗試
  const resolved = await resolveGeminiImageModel(apiKey)
  const candidates = [...new Set([resolved, ...GEMINI_IMAGE_MODELS_PREFERRED].filter(Boolean))]

  let lastError = null
  for (const model of candidates) {
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      if (res.status === 429) throw new Error('Gemini 配額超限，請稍候再試')
      // 模型不存在或不支援生圖 → 換下一個候選
      if (res.status === 404 || res.status === 400) {
        lastError = new Error(`模型 ${model} 不可用 (HTTP ${res.status})`)
        continue
      }
      throw new Error(`Gemini Image HTTP ${res.status}: ${txt.substring(0, 150)}`)
    }

    const data = await res.json()
    const images = extractImagesFromCandidates(data)
    if (images.length > 0) {
      imageModelCache = { key: apiKey, model }  // 記住成功的模型，下次直接用
      return images
    }
    lastError = new Error(`模型 ${model} 未回傳圖片`)
  }

  throw new Error(`所有 Gemini 生圖模型都無法使用（${lastError?.message || '未知原因'}），建議改用達哥 GAISF`)
}

export async function generateImageDalle(prompt, apiKey, model = 'Dalle3') {
  const url = gaisfEndpoint(`/openai/deployments/${model}/images/generations`, '2024-02-01')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    if (res.status === 404) throw new Error(`模型 ${model} 不可用`)
    throw new Error(`DALL-E HTTP ${res.status}: ${txt.substring(0, 100)}`)
  }

  const data = await res.json()
  return `data:image/png;base64,${data.data[0].b64_json}`
}

// ─── Image Compression (pure frontend) ───
// 將 data URL 圖片縮至 maxDim 內並轉 JPEG，降低 API 傳輸量
// （Vercel serverless 有 4.5MB body 限制，手機原圖容易超過）
export function compressImage(dataUrl, maxDim = 1536, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= maxDim && height <= maxDim && dataUrl.length < 1.5 * 1024 * 1024) {
        resolve(dataUrl)  // 已夠小，不處理
        return
      }
      const scale = Math.min(maxDim / width, maxDim / height, 1)
      width = Math.round(width * scale)
      height = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = dataUrl
  })
}

// ─── Color Extraction (pure frontend) ───
export function extractColors(imgEl, k = 6) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 120
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgEl, 0, 0, 120, 120)
  const { data } = ctx.getImageData(0, 0, 120, 120)

  const pixels = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]])
  }
  if (pixels.length === 0) return []

  let centers = Array.from({ length: k }, (_, i) => pixels[Math.floor(i * pixels.length / k)])

  for (let iter = 0; iter < 10; iter++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0])
    for (const [r, g, b] of pixels) {
      let min = Infinity, ci = 0
      for (let i = 0; i < k; i++) {
        const d = (r - centers[i][0]) ** 2 + (g - centers[i][1]) ** 2 + (b - centers[i][2]) ** 2
        if (d < min) { min = d; ci = i }
      }
      sums[ci][0] += r; sums[ci][1] += g; sums[ci][2] += b; sums[ci][3]++
    }
    centers = sums.map(([r, g, b, n], i) =>
      n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : centers[i]
    )
  }

  return centers.map(([r, g, b]) =>
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  )
}
