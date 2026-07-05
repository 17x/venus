/**
 * PropPanel Sections — engine-docs aligned form controls.
 *
 * Uses raw HTML inputs with Tailwind styling (matching engine-docs ModelControlPanel pattern).
 * No custom component wrappers — direct <input>, <select>, <textarea>, <input type="color">.
 *
 * AI-TEMP: Compact badge labels ("X", "Y", "W", "H", "R", "O", "C", "Bm", "Al", "Ca", "Jo");
 * full labels are in title attributes for accessibility.
 */

import type {SelectedElementProps} from '../../runtime/useEditorRuntime/types.ts'

// ---- Shared Tailwind input classes (engine-docs compact pattern) ----

const INPUT_NUMBER = 'h-6 w-full min-w-0 max-w-[88px] rounded bg-muted/25 px-1.5 text-xs tabular-nums outline-none'
const INPUT_TEXT = 'h-6 w-full min-w-0 rounded bg-muted/25 px-1.5 text-xs outline-none'
const INPUT_COLOR_SWATCH = 'size-6 shrink-0 cursor-pointer rounded border p-0'
const INPUT_COLOR_HEX = 'h-6 w-full min-w-0 max-w-[76px] rounded bg-muted/25 px-1.5 text-xs outline-none'
const SELECT_CLASS = 'h-6 rounded bg-muted/25 px-1 text-[11px] outline-none'
const BADGE_LABEL = 'flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground'
const SECTION_TITLE = 'mb-1 text-[11px] font-medium text-muted-foreground'
const FIELD_ROW = 'flex items-center gap-1'
const UNIT_LABEL = 'shrink-0 text-[10px] text-muted-foreground'

// ---- Section Props ----

interface SectionProps {
  props: SelectedElementProps
  patchElementProps: (nextProps: Partial<SelectedElementProps>) => void
}

// ---- Helpers ----

/** Patches a single numeric field on the selected element. */
function setNum(key: string, raw: string, patch: (p: Partial<SelectedElementProps>) => void) {
  const v = parseFloat(raw)
  if (!isNaN(v)) patch({[key]: v} as Partial<SelectedElementProps>)
}

/** Resolves text style from the first text run, or empty object. */
function getTextStyle(props: SelectedElementProps): Record<string, unknown> {
  if (props.type !== 'text') return {}
  const runs = Array.isArray((props as any).textRuns) ? (props as any).textRuns : []
  return runs[0]?.style ?? {}
}

/** Applies a style update to all text runs. */
function patchTextStyle(props: SelectedElementProps, patchFn: (p: Partial<SelectedElementProps>) => void, stylePatch: Record<string, unknown>) {
  if (props.type !== 'text') return
  const runs = Array.isArray((props as any).textRuns) ? [...(props as any).textRuns] as any[] : []
  const textLen = typeof props.text === 'string' ? props.text.length : 0
  const base = runs.length > 0 ? runs : [{start: 0, end: Math.max(0, textLen), style: {}}]
  patchFn({
    textRuns: base.map((r: any) => ({
      start: r.start ?? 0,
      end: r.end ?? Math.max(0, textLen),
      style: {...(r.style ?? {}), ...stylePatch},
    })),
  } as Partial<SelectedElementProps>)
}

// ---- Section Components ----

/** Identity: name only. Visible/Locked are layer-level icons in LayerPanel. */
export function IdentitySection({props, patchElementProps}: SectionProps) {
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Identity</div>
      <label className={FIELD_ROW}>
        <span className={BADGE_LABEL} title="Name">Nm</span>
        <input className={INPUT_TEXT} type="text" value={props.name ?? ''} placeholder={props.type ?? ''} onChange={(e) => patchElementProps({name: e.target.value})} />
      </label>
    </section>
  )
}

/** Layout: x, y, width, height, rotation, ellipse arc angles. */
export function LayoutSection({props, patchElementProps}: SectionProps) {
  const patch = (p: Partial<SelectedElementProps>) => patchElementProps(p)
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Layout</div>
      <div className={'grid grid-cols-2 gap-1'}>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="X">X</span><input className={INPUT_NUMBER} type="number" value={props.x ?? props.cx ?? 0} onChange={(e) => setNum('x', e.target.value, patch)} /></label>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Y">Y</span><input className={INPUT_NUMBER} type="number" value={props.y ?? props.cy ?? 0} onChange={(e) => setNum('y', e.target.value, patch)} /></label>
      </div>
      <div className={'grid grid-cols-2 gap-1'}>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Width">W</span><input className={INPUT_NUMBER} type="number" min={0} value={props.width ?? 0} onChange={(e) => setNum('width', e.target.value, patch)} /></label>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Height">H</span><input className={INPUT_NUMBER} type="number" min={0} value={props.height ?? 0} onChange={(e) => setNum('height', e.target.value, patch)} /></label>
      </div>
      <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Rotation">R</span><input className={INPUT_NUMBER} type="number" step={0.5} value={props.rotation ?? 0} onChange={(e) => setNum('rotation', e.target.value, patch)} /><span className={UNIT_LABEL}>°</span></label>
      {props.type === 'ellipse' && (
        <div className={'grid grid-cols-2 gap-1'}>
          <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Start Angle">Sa</span><input className={INPUT_NUMBER} type="number" step={0.5} value={props.ellipseStartAngle ?? 0} onChange={(e) => setNum('ellipseStartAngle', e.target.value, patch)} /><span className={UNIT_LABEL}>°</span></label>
          <label className={FIELD_ROW}><span className={BADGE_LABEL} title="End Angle">Ea</span><input className={INPUT_NUMBER} type="number" step={0.5} value={props.ellipseEndAngle ?? 360} onChange={(e) => setNum('ellipseEndAngle', e.target.value, patch)} /><span className={UNIT_LABEL}>°</span></label>
        </div>
      )}
    </section>
  )
}

/** Appearance: font family, font size, font weight, blend mode, opacity, corner radius. */
export function AppearanceSection({props, patchElementProps}: SectionProps) {
  const patch = (p: Partial<SelectedElementProps>) => patchElementProps(p)
  const isText = props.type === 'text'
  const ts = getTextStyle(props)
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Appearance</div>
      {isText && (
        <>
          <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Font">Fn</span><input className={INPUT_TEXT} type="text" value={String(ts.fontFamily ?? 'Arial')} placeholder="Arial" onChange={(e) => patchTextStyle(props, patch, {fontFamily: e.target.value})} /></label>
          <div className={'grid grid-cols-2 gap-1'}>
            <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Font Size">Sz</span><input className={INPUT_NUMBER} type="number" min={1} max={999} step={1} value={Number(ts.fontSize ?? 16)} onChange={(e) => patchTextStyle(props, patch, {fontSize: parseFloat(e.target.value) || 16})} /></label>
            <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Font Weight">Wt</span><input className={INPUT_NUMBER} type="number" min={100} max={900} step={100} value={Number(ts.fontWeight ?? 400)} onChange={(e) => patchTextStyle(props, patch, {fontWeight: parseFloat(e.target.value) || 400})} /></label>
          </div>
        </>
      )}
      <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Blend">Bm</span><select className={SELECT_CLASS + ' w-24'} value={props.blendMode ?? 'pass-through'} onChange={(e) => patch({blendMode: e.target.value || undefined})}><option value="pass-through">Pass Through</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option></select></label>
      <div className={'grid grid-cols-2 gap-1'}>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Opacity">O</span><input className={INPUT_NUMBER} type="number" min={0} max={1} step={0.01} value={props.opacity ?? 1} onChange={(e) => setNum('opacity', e.target.value, patch)} /></label>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Corner Radius">C</span><input className={INPUT_NUMBER} type="number" min={0} step={0.5} value={props.cornerRadius ?? 0} onChange={(e) => setNum('cornerRadius', e.target.value, patch)} /></label>
      </div>
    </section>
  )
}

/** Fill: color swatch + hex input, enabled toggle. */
export function FillSection({props, patchElementProps}: SectionProps) {
  const patch = (p: Partial<SelectedElementProps>) => patchElementProps(p)
  const fill = props.fill; const enabled = fill?.enabled !== false; const color = fill?.color ?? '#000000'
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Fill</div>
      <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Fill">Fl</span><input className={'size-4'} type="checkbox" checked={enabled} onChange={(e) => patch({fill: {enabled: e.target.checked, color}})} /><input className={INPUT_COLOR_SWATCH} type="color" value={color} onChange={(e) => patch({fill: {enabled, color: e.target.value}})} /><input className={INPUT_COLOR_HEX} type="text" value={color} onChange={(e) => patch({fill: {enabled, color: e.target.value}})} /></label>
    </section>
  )
}

/** Stroke: color, width, align, cap, join, enabled toggle. */
export function StrokeSection({props, patchElementProps}: SectionProps) {
  const patch = (p: Partial<SelectedElementProps>) => patchElementProps(p)
  const s = props.stroke; const enabled = s?.enabled !== false; const color = s?.color ?? '#000000'; const weight = s?.weight ?? 1; const cap = s?.cap ?? 'butt'; const join = s?.join ?? 'miter'; const align = props.strokeAlign ?? 'center'
  const ps = (o: Record<string, unknown>) => patch({stroke: {enabled, color, weight, cap, join, ...o}})
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Stroke</div>
      <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Stroke">St</span><input className={'size-4'} type="checkbox" checked={enabled} onChange={(e) => ps({enabled: e.target.checked})} /><input className={INPUT_COLOR_SWATCH} type="color" value={color} onChange={(e) => ps({color: e.target.value})} /><input className={INPUT_COLOR_HEX} type="text" value={color} onChange={(e) => ps({color: e.target.value})} /></label>
      <div className={'grid grid-cols-2 gap-1'}>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Width">Sw</span><input className={INPUT_NUMBER} type="number" min={0} step={0.25} value={weight} onChange={(e) => ps({weight: parseFloat(e.target.value) || 0})} /></label>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Align">Al</span><select className={SELECT_CLASS + ' w-20'} value={align} onChange={(e) => patchElementProps({strokeAlign: e.target.value})}><option value="center">Center</option><option value="inside">Inside</option><option value="outside">Outside</option></select></label>
      </div>
      <div className={'grid grid-cols-2 gap-1'}>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Cap">Ca</span><select className={SELECT_CLASS + ' w-20'} value={cap} onChange={(e) => ps({cap: e.target.value})}><option value="butt">Butt</option><option value="round">Round</option><option value="square">Square</option></select></label>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Join">Jo</span><select className={SELECT_CLASS + ' w-20'} value={join} onChange={(e) => ps({join: e.target.value})}><option value="miter">Miter</option><option value="round">Round</option><option value="bevel">Bevel</option></select></label>
      </div>
    </section>
  )
}

/** Effects: drop shadow (enabled, color, x, y, blur). */
export function EffectsSection({props, patchElementProps}: SectionProps) {
  const patch = (p: Partial<SelectedElementProps>) => patchElementProps(p)
  const sh = props.shadow; const enabled = sh?.enabled ?? false; const color = sh?.color ?? '#000000'; const ox = sh?.offsetX ?? 0; const oy = sh?.offsetY ?? 0; const blur = sh?.blur ?? 8
  const psh = (o: Record<string, unknown>) => patch({shadow: {enabled, color, offsetX: ox, offsetY: oy, blur, ...o}})
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Effects</div>
      <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Shadow">Ds</span><input className={'size-4'} type="checkbox" checked={enabled} onChange={(e) => psh({enabled: e.target.checked})} /><input className={INPUT_COLOR_SWATCH} type="color" value={color} onChange={(e) => psh({color: e.target.value})} /><input className={INPUT_COLOR_HEX} type="text" value={color} onChange={(e) => psh({color: e.target.value})} /></label>
      <div className={'grid grid-cols-3 gap-1'}>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Shadow X">Sx</span><input className={INPUT_NUMBER} type="number" step={0.5} value={ox} onChange={(e) => psh({offsetX: parseFloat(e.target.value) || 0})} /></label>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Shadow Y">Sy</span><input className={INPUT_NUMBER} type="number" step={0.5} value={oy} onChange={(e) => psh({offsetY: parseFloat(e.target.value) || 0})} /></label>
        <label className={FIELD_ROW}><span className={BADGE_LABEL} title="Blur">Sb</span><input className={INPUT_NUMBER} type="number" min={0} step={1} value={blur} onChange={(e) => psh({blur: parseFloat(e.target.value) || 0})} /></label>
      </div>
    </section>
  )
}
