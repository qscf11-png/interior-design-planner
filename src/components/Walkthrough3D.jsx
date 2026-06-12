import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

// ─── 常數 ───
const WALL_H = 2.6        // 牆高（公尺）
const WALL_T = 0.12       // 牆厚
const DOOR_W = 1.15       // 門洞寬
const EYE_H = 1.6         // 視線高度
const SPEED = 2.4         // 移動速度 m/s
const PING_M2 = 3.30579   // 1 坪 = 3.306 平方公尺

// 將 bbox（圖片百分比）換算為世界座標（公尺）
function roomsToWorld(rooms, totalPing) {
  const valid = (rooms || []).filter(r => Array.isArray(r.bbox) && r.bbox.length === 4 && r.bbox[2] > 0 && r.bbox[3] > 0)
  if (!valid.length) return []
  const sumPct = valid.reduce((s, r) => s + r.bbox[2] * r.bbox[3], 0)
  const scale = Math.sqrt(((totalPing || 30) * PING_M2) / sumPct)
  return valid.map((r, i) => ({
    i, name: r.name, color: r.color || '#d4a853',
    x: r.bbox[0] * scale, z: r.bbox[1] * scale,
    w: r.bbox[2] * scale, d: r.bbox[3] * scale,
  }))
}

// 區間扣除門洞後剩餘的牆段
function cutSegments(s0, e0, gaps) {
  let segs = [[s0, e0]]
  for (const [a, b] of gaps) {
    const next = []
    for (const [s, e] of segs) {
      if (b <= s || a >= e) { next.push([s, e]); continue }
      if (a > s) next.push([s, a])
      if (b < e) next.push([b, e])
    }
    segs = next
  }
  return segs.filter(([s, e]) => e - s > 0.06)
}

// 1D 重疊區間
function overlap1D(a0, a1, b0, b1) {
  const s = Math.max(a0, b0), e = Math.min(a1, b1)
  return e - s > 0 ? [s, e] : null
}

export default function Walkthrough3D({ rooms, totalPing, roomPhotos, onClose }) {
  const mountRef = useRef(null)
  const joyRef = useRef(null)
  const knobRef = useRef(null)
  const mapRef = useRef(null)
  const [status, setStatus] = useState('載入 3D 引擎...')

  useEffect(() => {
    let disposed = false
    let renderer, scene, camera, rafId
    const cleanupFns = []

    ;(async () => {
      const THREE = await import('three')
      if (disposed) return
      setStatus(null)

      const world = roomsToWorld(rooms, totalPing)
      if (!world.length) { setStatus('沒有房間座標資料，請重新執行 AI 分析'); return }

      // ─── 場景基礎 ───
      scene = new THREE.Scene()
      scene.background = new THREE.Color(0xeef1f5)
      scene.fog = new THREE.Fog(0xeef1f5, 18, 42)

      const mount = mountRef.current
      camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.05, 100)

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      mount.appendChild(renderer.domElement)

      scene.add(new THREE.AmbientLight(0xffffff, 0.75))
      const sun = new THREE.DirectionalLight(0xfff3e0, 1.1)
      sun.position.set(8, 14, 6)
      scene.add(sun)

      // ─── 地板與外圍地面 ───
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshLambertMaterial({ color: 0xd8dce2 })
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.y = -0.02
      scene.add(ground)

      for (const r of world) {
        const c = new THREE.Color(r.color).lerp(new THREE.Color(0xffffff), 0.55)
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(r.w, r.d),
          new THREE.MeshLambertMaterial({ color: c })
        )
        floor.rotation.x = -Math.PI / 2
        floor.position.set(r.x + r.w / 2, 0, r.z + r.d / 2)
        scene.add(floor)
      }

      // ─── 牆壁（相鄰房間自動留門洞）───
      const wallMat = new THREE.MeshLambertMaterial({ color: 0xf7f5f1 })
      const doorways = []   // {x, z} 門洞中心，碰撞判斷用
      const TOL = 0.35      // 邊界貼齊容差（公尺）

      const addWall = (cx, cz, len, horizontal) => {
        const geo = new THREE.BoxGeometry(horizontal ? len : WALL_T, WALL_H, horizontal ? WALL_T : len)
        const m = new THREE.Mesh(geo, wallMat)
        m.position.set(cx, WALL_H / 2, cz)
        scene.add(m)
      }

      for (const r of world) {
        // 每個房間四面牆：vertical edges (left/right), horizontal edges (top/bottom)
        const edges = [
          { id: 'L', horizontal: false, fixed: r.x,       span: [r.z, r.z + r.d] },
          { id: 'R', horizontal: false, fixed: r.x + r.w, span: [r.z, r.z + r.d] },
          { id: 'T', horizontal: true,  fixed: r.z,       span: [r.x, r.x + r.w] },
          { id: 'B', horizontal: true,  fixed: r.z + r.d, span: [r.x, r.x + r.w] },
        ]
        for (const edge of edges) {
          const gaps = []
          for (const o of world) {
            if (o.i === r.i) continue
            // 找出對向貼齊的邊
            const oFixed = edge.horizontal
              ? (edge.id === 'T' ? o.z + o.d : o.z)
              : (edge.id === 'L' ? o.x + o.w : o.x)
            if (Math.abs(oFixed - edge.fixed) > TOL) continue
            const oSpan = edge.horizontal ? [o.x, o.x + o.w] : [o.z, o.z + o.d]
            const ov = overlap1D(edge.span[0], edge.span[1], oSpan[0], oSpan[1])
            if (!ov || ov[1] - ov[0] < 0.8) continue

            if (o.i < r.i) {
              // 對方已畫過這段共用牆 → 整段跳過
              gaps.push(ov)
            } else {
              // 我負責畫，留門洞
              const mid = (ov[0] + ov[1]) / 2
              const w = Math.min(DOOR_W, (ov[1] - ov[0]) * 0.7)
              gaps.push([mid - w / 2, mid + w / 2])
              doorways.push(edge.horizontal
                ? { x: mid, z: edge.fixed }
                : { x: edge.fixed, z: mid })
            }
          }
          for (const [s, e] of cutSegments(edge.span[0], edge.span[1], gaps)) {
            const mid = (s + e) / 2
            if (edge.horizontal) addWall(mid, edge.fixed, e - s, true)
            else addWall(edge.fixed, mid, e - s, false)
          }
        }
      }

      // ─── 房間名稱標籤（Sprite）───
      for (const r of world) {
        const cv = document.createElement('canvas')
        cv.width = 256; cv.height = 80
        const ctx = cv.getContext('2d')
        ctx.fillStyle = 'rgba(30,30,40,0.72)'
        ctx.beginPath(); ctx.roundRect(8, 8, 240, 64, 16); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 34px "Microsoft JhengHei", sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(r.name, 128, 42)
        const tex = new THREE.CanvasTexture(cv)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }))
        sprite.scale.set(1.6, 0.5, 1)
        sprite.position.set(r.x + r.w / 2, 2.25, r.z + r.d / 2)
        scene.add(sprite)
      }

      // ─── 照片掛牆（依拍攝方位）───
      const loader = new THREE.TextureLoader()
      const dirToWall = { N: 'T', NE: 'T', NW: 'T', S: 'B', SE: 'B', SW: 'B', E: 'R', W: 'L' }
      for (const r of world) {
        const photos = roomPhotos?.[r.name] || []
        // 依牆面分組，沿牆均分排列
        const byWall = {}
        for (const p of photos) {
          const wall = dirToWall[p.dir] || 'T'
          ;(byWall[wall] ||= []).push(p)
        }
        for (const [wall, ps] of Object.entries(byWall)) {
          ps.forEach((p, k) => {
            const tex = loader.load(p.img)
            tex.colorSpace = THREE.SRGBColorSpace
            const pw = 1.35, ph = 1.0
            const frame = new THREE.Mesh(
              new THREE.BoxGeometry(pw + 0.08, ph + 0.08, 0.04),
              new THREE.MeshLambertMaterial({ color: 0x4a4a52 })
            )
            const pic = new THREE.Mesh(
              new THREE.PlaneGeometry(pw, ph),
              new THREE.MeshBasicMaterial({ map: tex })
            )
            // 沿牆均分位置
            const t = (k + 1) / (ps.length + 1)
            const inset = WALL_T / 2 + 0.05
            let px, pz, ry
            if (wall === 'T') { px = r.x + r.w * t; pz = r.z + inset; ry = 0 }
            else if (wall === 'B') { px = r.x + r.w * t; pz = r.z + r.d - inset; ry = Math.PI }
            else if (wall === 'L') { px = r.x + inset; pz = r.z + r.d * t; ry = Math.PI / 2 }
            else { px = r.x + r.w - inset; pz = r.z + r.d * t; ry = -Math.PI / 2 }
            frame.position.set(px, 1.5, pz); frame.rotation.y = ry
            pic.position.set(px, 1.5, pz); pic.rotation.y = ry
            pic.translateZ(0.035)
            scene.add(frame, pic)
          })
        }
      }

      // ─── 玩家狀態與控制 ───
      const biggest = world.reduce((a, b) => (a.w * a.d > b.w * b.d ? a : b))
      const player = { x: biggest.x + biggest.w / 2, z: biggest.z + biggest.d / 2, yaw: 0, pitch: 0 }
      const keys = {}
      const joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 }
      const look = { active: false, id: null, lx: 0, ly: 0 }

      const onKey = (down) => (e) => {
        keys[e.code] = down
        if (down && e.code === 'Escape') onClose()
      }
      const kd = onKey(true), ku = onKey(false)
      window.addEventListener('keydown', kd)
      window.addEventListener('keyup', ku)
      cleanupFns.push(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) })

      const el = renderer.domElement
      const onDown = (e) => {
        const rect = el.getBoundingClientRect()
        const isTouch = e.pointerType === 'touch'
        // 觸控：左下 45% 區域 = 搖桿，其他 = 視角；滑鼠一律視角
        if (isTouch && e.clientX - rect.left < rect.width * 0.45 && e.clientY - rect.top > rect.height * 0.4 && !joy.active) {
          joy.active = true; joy.id = e.pointerId
          joy.cx = e.clientX; joy.cy = e.clientY; joy.dx = 0; joy.dy = 0
          if (joyRef.current) {
            joyRef.current.style.display = 'block'
            joyRef.current.style.left = `${e.clientX - rect.left - 50}px`
            joyRef.current.style.top = `${e.clientY - rect.top - 50}px`
          }
        } else if (!look.active) {
          look.active = true; look.id = e.pointerId
          look.lx = e.clientX; look.ly = e.clientY
        }
        el.setPointerCapture(e.pointerId)
      }
      const onMove = (e) => {
        if (joy.active && e.pointerId === joy.id) {
          const max = 46
          joy.dx = Math.max(-max, Math.min(max, e.clientX - joy.cx))
          joy.dy = Math.max(-max, Math.min(max, e.clientY - joy.cy))
          if (knobRef.current) knobRef.current.style.transform = `translate(${joy.dx}px, ${joy.dy}px)`
        } else if (look.active && e.pointerId === look.id) {
          player.yaw -= (e.clientX - look.lx) * 0.005
          player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch - (e.clientY - look.ly) * 0.004))
          look.lx = e.clientX; look.ly = e.clientY
        }
      }
      const onUp = (e) => {
        if (e.pointerId === joy.id) {
          joy.active = false; joy.id = null; joy.dx = 0; joy.dy = 0
          if (joyRef.current) joyRef.current.style.display = 'none'
          if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'
        }
        if (e.pointerId === look.id) { look.active = false; look.id = null }
      }
      el.addEventListener('pointerdown', onDown)
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
      el.style.touchAction = 'none'

      // ─── 碰撞：必須留在房間內，跨房需經過門洞 ───
      const M = 0.18
      const containing = (x, z) => world.filter(r => x > r.x + M && x < r.x + r.w - M && z > r.z + M && z < r.z + r.d - M)
      const nearDoor = (x, z) => doorways.some(d => (d.x - x) ** 2 + (d.z - z) ** 2 < 1.1 * 1.1)

      const tryMove = (nx, nz) => {
        const cur = containing(player.x, player.z)
        const nxt = containing(nx, nz)
        if (!nxt.length) return false
        const sameRoom = nxt.some(r => cur.some(c => c.i === r.i))
        if (sameRoom || !cur.length || nearDoor(nx, nz)) { player.x = nx; player.z = nz; return true }
        return false
      }

      // ─── 小地圖 ───
      const drawMap = () => {
        const cv = mapRef.current
        if (!cv) return
        const ctx = cv.getContext('2d')
        const minX = Math.min(...world.map(r => r.x)), maxX = Math.max(...world.map(r => r.x + r.w))
        const minZ = Math.min(...world.map(r => r.z)), maxZ = Math.max(...world.map(r => r.z + r.d))
        const s = Math.min(cv.width / (maxX - minX + 1), cv.height / (maxZ - minZ + 1))
        ctx.clearRect(0, 0, cv.width, cv.height)
        for (const r of world) {
          ctx.fillStyle = r.color + '55'
          ctx.strokeStyle = '#ffffffaa'
          ctx.fillRect((r.x - minX) * s + 4, (r.z - minZ) * s + 4, r.w * s, r.d * s)
          ctx.strokeRect((r.x - minX) * s + 4, (r.z - minZ) * s + 4, r.w * s, r.d * s)
        }
        const px = (player.x - minX) * s + 4, pz = (player.z - minZ) * s + 4
        ctx.fillStyle = '#e0b54e'
        ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#e0b54e'
        ctx.beginPath(); ctx.moveTo(px, pz)
        ctx.lineTo(px + Math.sin(player.yaw + Math.PI) * 9, pz + Math.cos(player.yaw + Math.PI) * 9)
        ctx.stroke()
      }

      // ─── 主迴圈 ───
      const clock = new THREE.Clock()
      const animate = () => {
        rafId = requestAnimationFrame(animate)
        const dt = Math.min(clock.getDelta(), 0.05)

        let mx = 0, mz = 0
        if (keys.KeyW || keys.ArrowUp) mz += 1
        if (keys.KeyS || keys.ArrowDown) mz -= 1
        if (keys.KeyA || keys.ArrowLeft) mx -= 1
        if (keys.KeyD || keys.ArrowRight) mx += 1
        if (joy.active) { mx += joy.dx / 46; mz += -joy.dy / 46 }

        if (mx || mz) {
          const len = Math.hypot(mx, mz) || 1
          const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw)   // 前方
          const rx = -fz, rz = fx                                        // 右方
          const dx = (fx * mz / len + rx * mx / len) * SPEED * dt
          const dz = (fz * mz / len + rz * mx / len) * SPEED * dt
          if (!tryMove(player.x + dx, player.z + dz)) {
            tryMove(player.x + dx, player.z) || tryMove(player.x, player.z + dz)
          }
        }

        camera.position.set(player.x, EYE_H, player.z)
        camera.rotation.set(0, 0, 0)
        camera.rotateY(player.yaw)
        camera.rotateX(player.pitch)

        drawMap()
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        camera.aspect = mount.clientWidth / mount.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(mount.clientWidth, mount.clientHeight)
      }
      window.addEventListener('resize', onResize)
      cleanupFns.push(() => window.removeEventListener('resize', onResize))

      cleanupFns.push(() => {
        cancelAnimationFrame(rafId)
        el.removeEventListener('pointerdown', onDown)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
        renderer.dispose()
        scene.traverse(o => {
          o.geometry?.dispose?.()
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose?.(); m.dispose?.() })
        })
        mount.contains(renderer.domElement) && mount.removeChild(renderer.domElement)
      })
    })()

    return () => { disposed = true; cleanupFns.forEach(f => f()) }
  }, [rooms, totalPing, roomPhotos, onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#1a1c22' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {status && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15 }}>
          {status}
        </div>
      )}

      {/* 關閉 */}
      <button onClick={onClose}
        style={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', right: 14, zIndex: 10, width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(20,20,28,0.55)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <X size={20} />
      </button>

      {/* 操作提示 */}
      <div style={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: 14, zIndex: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(20,20,28,0.55)', backdropFilter: 'blur(10px)', color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.5 }}>
        🖱️ 拖曳轉視角 · WASD/方向鍵移動<br />📱 左下搖桿移動 · 右側拖曳看四周
      </div>

      {/* 小地圖 */}
      <canvas ref={mapRef} width={128} height={128}
        style={{ position: 'absolute', bottom: 'max(14px, env(safe-area-inset-bottom))', right: 14, zIndex: 10, borderRadius: 12, background: 'rgba(20,20,28,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }} />

      {/* 虛擬搖桿（觸控時顯示）*/}
      <div ref={joyRef} style={{ display: 'none', position: 'absolute', width: 100, height: 100, zIndex: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }}>
        <div ref={knobRef} style={{ position: 'absolute', left: 30, top: 30, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.45)' }} />
      </div>
    </div>
  )
}
