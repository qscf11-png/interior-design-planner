const K = {
  settings: 'idp:settings',
  properties: 'idp:properties',
  floorPlans: 'idp:floorplans',
  floorSession: 'idp:floor-session',
  favorites: 'idp:favorites',
  style: 'idp:style',
  budget: 'idp:budget',
  shopping: 'idp:shopping',
}

const get = (k, d = null) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d }
}
const set = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {
    if (e.name === 'QuotaExceededError') throw new Error('儲存空間不足，請刪除部分圖片後再試。')
    throw e
  }
}

export const getSettings = () => get(K.settings, {})
export const saveSettings = (v) => set(K.settings, v)

export const getProperties = () => get(K.properties, [])
export const addProperty = (p) => {
  const arr = getProperties()
  const item = { ...p, id: Date.now().toString(), createdAt: new Date().toISOString() }
  set(K.properties, [...arr, item])
  return item
}
export const updateProperty = (id, updates) =>
  set(K.properties, getProperties().map(p => p.id === id ? { ...p, ...updates } : p))
export const deleteProperty = (id) =>
  set(K.properties, getProperties().filter(p => p.id !== id))

export const getFloorPlan = (propertyId) =>
  get(K.floorPlans, {})[propertyId] || null
export const saveFloorPlan = (propertyId, data) => {
  const all = get(K.floorPlans, {})
  set(K.floorPlans, { ...all, [propertyId]: { ...data, updatedAt: new Date().toISOString() } })
}

// 設計收藏（喜歡的生成圖）；propertyId 為 null 表示未分類
export const getFavorites = () => get(K.favorites, [])
export const addFavorite = (item) => {
  const arr = getFavorites()
  const newItem = { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() }
  set(K.favorites, [newItem, ...arr])  // 可能 throw QuotaExceeded（呼叫端 catch）
  return newItem
}
export const deleteFavorite = (id) =>
  set(K.favorites, getFavorites().filter(f => f.id !== id))
// 以圖片內容比對是否已收藏（同一張 dataUrl 視為同一張）
export const findFavoriteByImg = (img) => getFavorites().find(f => f.img === img) || null

// 格局分析工作階段（圖片、分析結果、坪數修正、各房間照片）
export const getFloorSession = () => get(K.floorSession, null)
export const saveFloorSession = (v) => set(K.floorSession, v)
export const clearFloorSession = () => { try { localStorage.removeItem(K.floorSession) } catch { /* 忽略 */ } }

export const getStyleData = () =>
  get(K.style, { quizAnswers: {}, images: [], palette: [], styleResult: null })
export const saveStyleData = (v) => set(K.style, v)

export const getBudget = () => get(K.budget, { total: 0, categories: DEFAULT_CATEGORIES })
export const saveBudget = (v) => set(K.budget, v)

export const getShoppingItems = () => get(K.shopping, [])
export const addShoppingItem = (item) => {
  const arr = getShoppingItems()
  const newItem = { ...item, id: Date.now().toString(), checked: false, createdAt: new Date().toISOString() }
  set(K.shopping, [...arr, newItem])
  return newItem
}
export const updateShoppingItem = (id, updates) =>
  set(K.shopping, getShoppingItems().map(i => i.id === id ? { ...i, ...updates } : i))
export const deleteShoppingItem = (id) =>
  set(K.shopping, getShoppingItems().filter(i => i.id !== id))

export const DEFAULT_CATEGORIES = [
  { id: 'floor',     name: '地板工程', icon: '🪵', pct: 12, spent: 0, color: '#d4a853' },
  { id: 'wall',      name: '牆面工程', icon: '🧱', pct: 10, spent: 0, color: '#8b7cf6' },
  { id: 'kitchen',   name: '廚房設備', icon: '🍳', pct: 20, spent: 0, color: '#5cba9d' },
  { id: 'bathroom',  name: '衛浴設備', icon: '🚿', pct: 15, spent: 0, color: '#60a5fa' },
  { id: 'furniture', name: '家具採購', icon: '🛋️', pct: 18, spent: 0, color: '#f87171' },
  { id: 'lighting',  name: '燈飾照明', icon: '💡', pct: 7,  spent: 0, color: '#fbbf24' },
  { id: 'deco',      name: '軟裝佈置', icon: '🎨', pct: 8,  spent: 0, color: '#a78bfa' },
  { id: 'misc',      name: '雜項工程', icon: '🔧', pct: 10, spent: 0, color: '#94a3b8' },
]
