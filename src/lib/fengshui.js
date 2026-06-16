// 陽宅風水選址評估引擎（由 fengshui_assistant/house_evaluator.py 移植）
// 專為蔡德耕 (TK)：巽卦 / 東四命 / 巽木命。2026 飛星盤已修正為「一白入中」正確盤。

export const TK_NAME = '蔡德耕 (TK)'
export const TK_GUA = '巽木 · 東四命'

// 選單用方位（八方）
export const DIRECTIONS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北']
export const SHA_OPTIONS = ['路沖', '壁刀', '反弓']

// TK 的八宅命卦吉凶（命卦決定，時間不變）
const TK_FENGSHUI_MAP = {
  '北':   { status: '吉', star: '生氣 (大吉)', score: 10 },
  '東':   { status: '吉', star: '延年 (中吉)', score: 8 },
  '南':   { status: '吉', star: '天醫 (次吉)', score: 8 },
  '東南': { status: '吉', star: '伏位 (小吉)', score: 6 },
  '西':   { status: '凶', star: '禍害 (小凶)', score: 2 },
  '西北': { status: '凶', star: '六煞 (中凶)', score: 2 },
  '西南': { status: '凶', star: '五鬼 (大凶)', score: 1 },
  '東北': { status: '凶', star: '絕命 (至凶)', score: 0 },
}

// 2026 丙午年「一白入中宮」順飛正確盤
const STAR_2026 = {
  '南':   { star: '五黃廉貞星', status: '至凶' },
  '西北': { star: '二黑巨門星', status: '大凶' },
  '西':   { star: '三碧祿存星', status: '小凶' },
  '西南': { star: '七赤破軍星', status: '小凶' },
  '中宮': { star: '一白貪狼星', status: '吉' },
  '東':   { star: '八白左輔星', status: '大吉' },
  '東南': { star: '九紫右弼星', status: '特吉' },
  '北':   { star: '六白武曲星', status: '吉' },
  '東北': { star: '四綠文曲星', status: '吉' },
}

// 主評估函式：回傳分數、評級、三維度細項與化解建議
export function calculateFengshui({ facing, door, bedroom, kitchen, shas = [], lighting = 4 }) {
  const bazhaiDetails = []
  const starDetails = []
  const envDetails = []

  // ── 1. 八宅明鏡本命共振 (滿分 40) ──
  let bazhai = 0
  const isEastHouse = ['南', '北', '西', '西北'].includes(facing)
  if (isEastHouse) {
    bazhai += 15
    bazhaiDetails.push(`🏠 房屋朝【${facing}】屬東四宅，與巽木命磁場高度共振！ (+15)`)
  } else {
    bazhai += 5
    bazhaiDetails.push(`🏠 房屋朝【${facing}】屬西四宅，與巽木命略有磁場排斥。 (+5)`)
  }
  const dInfo = TK_FENGSHUI_MAP[door] || { status: '凶', star: '未知', score: 2 }
  bazhai += dInfo.score * 1.5
  bazhaiDetails.push(`🚪 大門位於【${door}】(${dInfo.star})：開門納「${dInfo.status}氣」。 (+${(dInfo.score * 1.5).toFixed(1)})`)
  const bInfo = TK_FENGSHUI_MAP[bedroom] || { status: '凶', star: '未知', score: 2 }
  bazhai += bInfo.score * 0.75
  bazhaiDetails.push(`🛏️ 主臥位於【${bedroom}】(${bInfo.star})：睡眠納「${bInfo.status}氣」。 (+${(bInfo.score * 0.75).toFixed(1)})`)
  const kInfo = TK_FENGSHUI_MAP[kitchen] || { status: '凶', star: '未知', score: 2 }
  if (kInfo.status === '凶') {
    bazhai += 2.5
    bazhaiDetails.push(`🍳 廚房位於【${kitchen}】(${kInfo.star})：成功「坐凶壓煞」，燒盡晦氣！ (+2.5)`)
  } else {
    bazhai += 0.5
    bazhaiDetails.push(`🍳 廚房位於【${kitchen}】(${kInfo.star})：落吉方易「火燒吉位」，略損家運。 (+0.5)`)
  }

  // ── 2. 2026 流年飛星 (滿分 30，依星性動態判斷) ──
  let star = 30
  const dStar = STAR_2026[door] || { star: '未知星', status: '平' }
  if (dStar.status === '至凶') { star -= 15; starDetails.push(`🛑 2026 大門直對【${door} (${dStar.star})】：五黃大凶星直沖氣口！ (-15)`) }
  else if (dStar.status === '大凶') { star -= 10; starDetails.push(`⚠️ 2026 大門對【${door} (${dStar.star})】：二黑病符臨門。 (-10)`) }
  else if (dStar.status === '小凶') { star -= 5; starDetails.push(`⚠️ 2026 大門位於【${door} (${dStar.star})】：小凶星，宜化解。 (-5)`) }
  else { starDetails.push(`✨ 2026 大門位於【${door} (${dStar.star})】：納流年吉氣。`) }
  const bStar = STAR_2026[bedroom] || { star: '未知星', status: '平' }
  if (bStar.status === '至凶') { star -= 10; starDetails.push(`🛑 2026 主臥位於【${bedroom} (${bStar.star})】：睡眠磁場受損，忌動土！ (-10)`) }
  else if (bStar.status === '大凶') { star -= 8; starDetails.push(`⚠️ 2026 主臥位於【${bedroom} (${bStar.star})】：落病符位，易失眠、精神萎靡。 (-8)`) }
  else { starDetails.push(`✨ 2026 主臥位於【${bedroom} (${bStar.star})】：利流年身心調和。`) }

  // ── 3. 巒頭外煞與採光 (滿分 30) ──
  let env = 30
  const lightScore = Math.min(Math.max(lighting, 1), 5) * 3
  env -= (15 - lightScore)
  envDetails.push(`☀️ 採光通風 ${Math.round(lightScore / 3)}/5。 (+${lightScore})`)
  let hasSha = false
  for (const sha of shas) {
    if (sha === '路沖') { env -= 10; envDetails.push('🔪 路沖煞：外部氣流直沖，干擾強烈。 (-10)'); hasSha = true }
    else if (sha === '壁刀') { env -= 8; envDetails.push('🔪 壁刀煞：鄰樓牆角切入，影響心肺。 (-8)'); hasSha = true }
    else if (sha === '反弓') { env -= 8; envDetails.push('🔪 反弓煞：路/河弧度反拉，財氣易漏。 (-8)'); hasSha = true }
  }
  if (!hasSha) envDetails.push('🍀 外部格局清爽，無明顯煞氣直沖。')

  // ── 總分與評級 ──
  let total = Math.min(Math.max(bazhai + star + env, 0), 100)
  total = Math.round(total * 10) / 10

  let rating, ratingDesc, level
  if (total >= 85) { rating = '🥇 極力推薦'; level = 'green'; ratingDesc = '與你的巽木命完美契合、流年大吉、無重大外煞的頂級住宅！' }
  else if (total >= 70) { rating = '🥈 適合居住'; level = 'gold'; ratingDesc = '整體和諧，小瑕疵可用家具佈局、綠植或擺飾化解，值得考慮！' }
  else if (total >= 55) { rating = '🥉 勉力入住'; level = 'orange'; ratingDesc = '與本命卦較多相剋，或沖犯流年凶星，需深度風水工程化解。' }
  else { rating = '❌ 強烈避開'; level = 'red'; ratingDesc = '座向嚴重排斥、大門沖煞，居住易健康損耗，建議放棄。' }

  // ── 化解建議 ──
  const remedies = []
  const starText = starDetails.join('')
  if (starText.includes('五黃')) remedies.push('正南（五黃煞）：掛銅製風鈴或六枚乾隆銅錢，今年勿在正南釘釘、敲打、動土。')
  if (starText.includes('二黑')) remedies.push('西北（二黑病符）：西北角掛銅葫蘆，以金洩土氣化病，保呼吸與消化系統。')
  const envText = envDetails.join('')
  if (envText.includes('壁刀')) remedies.push('壁刀煞：面對牆角處擺茂密常綠植物（如虎尾蘭），窗裝山海鎮/反射鏡。')
  if (envText.includes('路沖')) remedies.push('路沖煞：玄關設不透光實牆櫃擋氣，陽台加裝厚重防光窗簾。')
  if (remedies.length === 0) remedies.push('此屋風水極佳，保持明財位（大門 45° 斜對角）乾淨明亮，擺一盆發財樹即可。')

  return {
    scores: { total, bazhai: Math.round(bazhai * 10) / 10, star, env },
    rating, ratingDesc, level,
    bazhaiDetails, starDetails, envDetails, remedies,
    inputs: { facing, door, bedroom, kitchen, shas, lighting },
  }
}
