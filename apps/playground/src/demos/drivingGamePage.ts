import {createEngine} from '@venus/engine'
import {createInitialDrivingGameState, type DrivingGameConfig, type DrivingGameState} from './drivingGameTypes'
import {buildDrivingGameScene} from './drivingGameScene'

const STAGE_W = 720, STAGE_H = 460
let currentState: DrivingGameState | null = null

function renderSettings(container: HTMLElement, state: DrivingGameState) {
  const {config} = state
  const chk = (l: string, k: keyof DrivingGameConfig) =>
    `<label class="setting-row"><span>${l}</span><input type="checkbox"${config[k] ? ' checked' : ''} data-s="${k}"/></label>`
  const rng = (l: string, k: keyof DrivingGameConfig, min: number, max: number, step: number) =>
    `<label class="setting-row"><span>${l}: ${(config[k] as number).toFixed(1)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${config[k]}" data-s="${k}"/></label>`
  container.innerHTML = [
    chk('Show FPS', 'showFps'),
    chk('Camera Lock', 'cameraLock'),
    chk('Ground Grid', 'worldGridEnabled'),
    chk('Shadows', 'shadowsEnabled'),
    chk('Antialias', 'antialiasEnabled'),
    chk('Vsync', 'vsyncEnabled'),
    rng('Zoom', 'cameraDistance', 0.5, 3, 0.1),
    rng('Pitch', 'cameraPitch', 15, 80, 1),
    rng('Target Height', 'cameraTargetHeight', -10, 40, 1),
    rng('FOV', 'cameraFovY', 30, 100, 1),
    rng('Near', 'cameraNear', 0.05, 5, 0.05),
    rng('Far', 'cameraFar', 500, 10000, 100),
    rng('Orbit Sens', 'cameraOrbitSensitivity', 0.05, 0.8, 0.01),
    rng('Zoom Sens', 'cameraZoomSensitivity', 0.0001, 0.002, 0.0001),
    rng('Q/E Orbit Speed', 'cameraOrbitKeyboardSpeed', 20, 200, 2),
    rng('Move Speed', 'carSpeed', 2, 30, 0.5),
    rng('Acceleration', 'carAcceleration', 4, 60, 1),
    rng('Brake', 'carBrakeDeceleration', 8, 80, 1),
    rng('Drag', 'carDrag', 0.5, 10, 0.1),
    rng('Turn Speed', 'carTurnSpeed', 60, 360, 5),
    rng('Map Size', 'mapSize', 240, 900, 10),
    rng('Grid Step', 'worldGridStep', 8, 72, 1),
    rng('Grid Thickness', 'worldGridThickness', 0.2, 3, 0.1),
    '<div class="setting-status">',
    `<p>Speed: ${state.speed.toFixed(1)}</p>`,
    `<p>Vx: ${state.velocityX.toFixed(2)} / Vy: ${state.velocityY.toFixed(2)}</p>`,
    `<p>X: ${state.carX.toFixed(0)} / Y: ${state.carY.toFixed(0)}</p>`,
    `<p>Yaw: ${state.carYaw.toFixed(0)}°</p>`,
    '</div>',
    '<div class="hint"><p>WASD / Arrows: Move (Camera Relative)</p><p>Q / E: Orbit Camera</p><p>Space: Brake</p><p>Drag Mouse: Orbit Camera</p><p>Wheel: Zoom</p></div>',
  ].join('')
  container.querySelectorAll<HTMLInputElement>('[data-s]').forEach((el) => {
    const key = el.dataset.s as keyof DrivingGameConfig
    const handler = () => {
      if (!currentState) return
      if (el.type === 'checkbox') (currentState.config as unknown as Record<string, unknown>)[key] = el.checked
      else (currentState.config as unknown as Record<string, unknown>)[key] = parseFloat(el.value)
      renderSettings(container, currentState)
    }
    el.addEventListener('input', handler)
    el.addEventListener('change', handler)
  })
}

export async function tryMountDrivingGamePage(): Promise<boolean> {
  if (window.location.hash.replace('#', '') !== '/driving-game') return false
  await mount()
  return true
}

async function mount() {
  const root = document.getElementById('root')!
  root.innerHTML = `
    <div class="dg">
      <div class="lo" id="lo">
        <div class="lb"><h2>Loading</h2><div class="pb"><div class="pf" id="pf"></div></div><p id="lt">Initializing...</p></div>
      </div>
      <div class="gl">
        <div class="cp">
          <canvas id="gc" class="gc"></canvas>
          <div class="fps" id="fc">FPS: --</div>
          <div id="db" style="position:absolute;bottom:4px;left:4px;color:#0f0;font:11px monospace;background:rgba(0,0,0,0.7);padding:2px 6px">...</div>
        </div>
        <div class="sp">
          <h3>Settings</h3>
          <div id="sc"></div>
        </div>
      </div>
    </div>`

  const state = createInitialDrivingGameState()
  currentState = state
  const canvas = root.querySelector<HTMLCanvasElement>('#gc')!
  const fpsEl = root.querySelector<HTMLDivElement>('#fc')!
  const dbEl = root.querySelector<HTMLDivElement>('#db')!
  const overlay = root.querySelector<HTMLDivElement>('#lo')!
  const progressFill = root.querySelector<HTMLDivElement>('#pf')!
  const progressLabel = root.querySelector<HTMLParagraphElement>('#lt')!
  const settingsContainer = root.querySelector<HTMLDivElement>('#sc')!

  canvas.width = STAGE_W
  canvas.height = STAGE_H

  const updateProgress = (pct: number, text: string) => {
    progressFill.style.width = `${pct}%`
    progressLabel.textContent = text
  }

  const engine = createEngine({
    surface: {
      width: STAGE_W, height: STAGE_H,
      canvas: {
        width: canvas.width, height: canvas.height,
        getContext: (ctxId: '2d' | 'webgl' | 'webgl2') => {
          if (ctxId === '2d') return canvas.getContext('2d')
          if (ctxId === 'webgl') return canvas.getContext('webgl')
          return canvas.getContext('webgl2')
        },
      },
    },
    backend: 'webgl',
    strict3d: true,
  })

  updateProgress(10, `Canvas: ${STAGE_W}×${STAGE_H}`)
  await delay(100)

  engine.setGraph(buildDrivingGameScene(state) as any)
  updateProgress(40, 'Graph set')
  await delay(100)

  await engine.render()
  const stats = engine.getStats()
  updateProgress(90, `Draw: ${stats.lastExecutionDrawCount ?? 0}`)
  await delay(300)

  overlay.style.display = 'none'
  renderSettings(settingsContainer, state)

  let lastFrame = performance.now()
  let frameCount = 0
  let fpsTimer = lastFrame
  let orbitDragging = false
  let orbitPointerId: number | null = null
  let lastPointerX = 0
  let lastPointerY = 0

  const loop = () => {
    if (state.paused) { requestAnimationFrame(loop); return }

    const now = performance.now()
    const dt = Math.min((now - lastFrame) / 1000, 0.1)
    lastFrame = now

    updateGame(state, dt)
    engine.setGraph(buildDrivingGameScene(state) as any)
    engine.render()

    frameCount++
    if (now - fpsTimer >= 500) {
      if (state.config.showFps) fpsEl.textContent = `FPS: ${Math.round(frameCount / ((now - fpsTimer) / 1000))}`
      const s = engine.getStats()
      const backend = (engine.getDiagnostics().backendDiagnostics as Record<string, unknown> | undefined) ?? undefined
      const meshSubmitted = backend && typeof backend.webglNativeMeshSubmittedCount === 'number'
        ? String(backend.webglNativeMeshSubmittedCount)
        : '?'
      dbEl.textContent = `draw:${s.lastExecutionDrawCount ?? '?'} mesh:${meshSubmitted} zoom:${state.config.cameraDistance.toFixed(1)}`
      frameCount = 0; fpsTimer = now
    }
    requestAnimationFrame(loop)
  }

  const onKD = (ev: KeyboardEvent) => state.keysDown.add(ev.key.toLowerCase())
  const onKU = (ev: KeyboardEvent) => state.keysDown.delete(ev.key.toLowerCase())
  window.addEventListener('keydown', onKD)
  window.addEventListener('keyup', onKU)

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault()
    state.config.cameraDistance = Math.max(0.3, Math.min(3, state.config.cameraDistance + ev.deltaY * state.config.cameraZoomSensitivity))
    renderSettings(settingsContainer, state)
  }, {passive: false})

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return
    orbitDragging = true
    orbitPointerId = ev.pointerId
    lastPointerX = ev.clientX
    lastPointerY = ev.clientY
    canvas.setPointerCapture(ev.pointerId)
  })

  canvas.addEventListener('pointermove', (ev) => {
    if (!orbitDragging || orbitPointerId !== ev.pointerId) return
    const dx = ev.clientX - lastPointerX
    const dy = ev.clientY - lastPointerY
    lastPointerX = ev.clientX
    lastPointerY = ev.clientY
    state.cameraOrbitAngle -= dx * state.config.cameraOrbitSensitivity
    state.config.cameraPitch = Math.max(15, Math.min(80, state.config.cameraPitch + dy * 0.15))
  })

  const stopOrbitDrag = (ev: PointerEvent) => {
    if (orbitPointerId !== ev.pointerId) return
    orbitDragging = false
    orbitPointerId = null
    canvas.releasePointerCapture(ev.pointerId)
  }
  canvas.addEventListener('pointerup', stopOrbitDrag)
  canvas.addEventListener('pointercancel', stopOrbitDrag)

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('keydown', onKD)
    window.removeEventListener('keyup', onKU)
    engine.dispose()
  })

  requestAnimationFrame(loop)
}

function updateGame(state: DrivingGameState, dt: number) {
  const {keysDown, config} = state
  let mx = 0, my = 0
  if (keysDown.has('w') || keysDown.has('arrowup')) my = 1
  if (keysDown.has('s') || keysDown.has('arrowdown')) my = -1
  if (keysDown.has('a') || keysDown.has('arrowleft')) mx = 1
  if (keysDown.has('d') || keysDown.has('arrowright')) mx = -1

  if (mx !== 0 || my !== 0) {
    const len = Math.sqrt(mx * mx + my * my)
    mx /= len; my /= len
    const cameraYawRad = (state.cameraOrbitAngle * Math.PI) / 180
    const forwardX = -Math.sin(cameraYawRad)
    const forwardY = -Math.cos(cameraYawRad)
    const rightX = Math.cos(cameraYawRad)
    const rightY = -Math.sin(cameraYawRad)
    const wishX = forwardX * my + rightX * mx
    const wishY = forwardY * my + rightY * mx
    state.velocityX += wishX * config.carAcceleration * dt
    state.velocityY += wishY * config.carAcceleration * dt
  } else {
    const drag = Math.max(0, 1 - config.carDrag * dt)
    state.velocityX *= drag
    state.velocityY *= drag
  }

  if (keysDown.has(' ')) {
    const brakeFactor = Math.max(0, 1 - config.carBrakeDeceleration * dt * 0.1)
    state.velocityX *= brakeFactor
    state.velocityY *= brakeFactor
  }

  const velocityLength = Math.hypot(state.velocityX, state.velocityY)
  const maxVelocity = config.carSpeed
  if (velocityLength > maxVelocity) {
    const clamp = maxVelocity / velocityLength
    state.velocityX *= clamp
    state.velocityY *= clamp
  }

  state.carX += state.velocityX * dt
  state.carY += state.velocityY * dt
  state.speed = Math.hypot(state.velocityX, state.velocityY)

  if (keysDown.has('q')) state.cameraOrbitAngle -= config.cameraOrbitKeyboardSpeed * dt
  if (keysDown.has('e')) state.cameraOrbitAngle += config.cameraOrbitKeyboardSpeed * dt

  if (state.speed > 0.02) {
    const targetYaw = (Math.atan2(state.velocityX, -state.velocityY) * 180) / Math.PI
    let deltaYaw = targetYaw - state.carYaw
    while (deltaYaw > 180) deltaYaw -= 360
    while (deltaYaw < -180) deltaYaw += 360
    const maxTurn = config.carTurnSpeed * dt
    if (deltaYaw > maxTurn) deltaYaw = maxTurn
    if (deltaYaw < -maxTurn) deltaYaw = -maxTurn
    state.carYaw += deltaYaw
  }

  const half = state.config.mapSize / 2 - 5
  state.carX = Math.max(-half, Math.min(half, state.carX))
  state.carY = Math.max(-half, Math.min(half, state.carY))
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)) }
