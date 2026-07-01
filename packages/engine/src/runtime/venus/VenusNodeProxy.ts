/**
 * VenusNodeProxy — Figma-style mutable node proxies.
 *
 * Every venus.add(...) returns a typed proxy where property assignment
 * automatically commits to the internal store:
 *
 *   const r = venus.add({type:'rect', x:10, y:10, width:100, height:80})
 *   r.width = 200
 *   r.fill = '#ff0000'
 *   r.cornerRadius = 12            // VenusRectProxy
 *   r.remove()
 *
 * All mutations flow through venus.update(...) / venus.remove(...).
 */
import type {Venus} from './Venus.ts'
import type {
  VenusBlendMode,
  VenusDocumentModelType,
  VenusNode,
  VenusTransform2D,
} from './Venus.ts'
import type { EngineFillConfig, EngineStrokeConfig, EngineVisualEffects } from '../../scene/types/types.ts'

// ── Base proxy ────────────────────────────────────────────────────────────────

/** Base class for all Venus node proxies with Figma-style getter/setter pairs. */
export class VenusNodeProxy {
  /** Stable node id assigned during add(). */
  readonly id: string
  /** Document model kind of the backing node. */
  readonly type: VenusDocumentModelType
  /** Venus runtime instance that owns this node. */
  protected readonly venus: Venus

  constructor(venus: Venus, id: string, type: VenusDocumentModelType) {
    this.venus = venus
    this.id = id
    this.type = type
  }

  /** Returns the raw VenusNode from the internal store. */
  protected get raw(): any {
    return (this.venus as unknown as {_rawNode(id: string): VenusNode | undefined})._rawNode(this.id)
  }

  /** Commits one property change to the document store. */
  protected set(key: string, value: unknown): void {
    this.venus.update(this.id, {[key]: value} as Partial<VenusNode>)
  }

  // ── Identity ─────────────────────────────────────────────────────────

  get name(): string | undefined { return this.raw?.name }
  set name(value: string | undefined) { this.set('name', value) }

  get visible(): boolean { return this.raw?.visible ?? true }
  set visible(value: boolean) { this.set('visible', value) }

  get locked(): boolean { return this.raw?.locked ?? false }
  set locked(value: boolean) { this.set('locked', value) }

  // ── Geometry ─────────────────────────────────────────────────────────

  get x(): number { return this.raw?.x ?? 0 }
  set x(value: number) { this.set('x', value) }

  get y(): number { return this.raw?.y ?? 0 }
  set y(value: number) { this.set('y', value) }

  get width(): number { return this.raw?.width ?? 0 }
  set width(value: number) { this.set('width', value) }

  get height(): number { return this.raw?.height ?? 0 }
  set height(value: number) { this.set('height', value) }

  get rotation(): number { return this.raw?.rotation ?? 0 }
  set rotation(value: number) { this.set('rotation', value) }

  get transform(): VenusTransform2D | undefined { return this.raw?.transform }
  set transform(value: VenusTransform2D | undefined) { this.set('transform', value) }

  // ── Appearance ───────────────────────────────────────────────────────

  get opacity(): number { return this.raw?.opacity ?? 1 }
  set opacity(value: number) { this.set('opacity', value) }

  get blendMode(): VenusBlendMode | undefined { return this.raw?.blendMode as VenusBlendMode | undefined }
  set blendMode(value: VenusBlendMode | undefined) { this.set('blendMode', value) }

  get fill(): string | undefined { return this.raw?.fill }
  set fill(value: string | undefined) { this.set('fill', value) }

  get fillConfig(): EngineFillConfig | undefined { return this.raw?.fillConfig }
  set fillConfig(value: EngineFillConfig | undefined) { this.set('fillConfig', value) }

  get strokeConfig(): EngineStrokeConfig | undefined { return this.raw?.strokeConfig }
  set strokeConfig(value: EngineStrokeConfig | undefined) { this.set('strokeConfig', value) }

  get stroke(): string | undefined { return this.raw?.stroke }
  set stroke(value: string | undefined) { this.set('stroke', value) }

  get strokeWidth(): number { return this.raw?.strokeWidth ?? 0 }
  set strokeWidth(value: number) { this.set('strokeWidth', value) }

  get strokeAlign(): 'center' | 'inside' | 'outside' | undefined { return this.raw?.strokeAlign }
  set strokeAlign(value: 'center' | 'inside' | 'outside' | undefined) { this.set('strokeAlign', value) }

  get strokeDashArray(): readonly number[] | undefined { return this.raw?.strokeDashArray }
  set strokeDashArray(value: readonly number[] | undefined) { this.set('strokeDashArray', value) }

  // ── Effects ──────────────────────────────────────────────────────────

  get shadow(): {color?: string; blur?: number; offsetX?: number; offsetY?: number} | undefined {
    return this.raw?.shadow
  }
  set shadow(value: {color?: string; blur?: number; offsetX?: number; offsetY?: number} | undefined) {
    this.set('shadow', value)
  }

  get innerShadow(): {color?: string; blur?: number} | undefined {
    return this.raw?.innerShadow
  }
  set innerShadow(value: {color?: string; blur?: number} | undefined) {
    this.set('innerShadow', value)
  }

  get layerBlur(): number {
    return this.raw?.layerBlur?.amount ?? 0
  }
  set layerBlur(value: number) {
    this.set('layerBlur', value > 0 ? {amount: value} : undefined)
  }

  get visual(): EngineVisualEffects | undefined {
    return this.raw?.visual
  }
  set visual(value: EngineVisualEffects | undefined) {
    this.set('visual', value)
  }

  // ── Mutation ─────────────────────────────────────────────────────────

  /** Removes this node from the document. */
  remove(): void {
    this.venus.remove(this.id)
  }

  /** Applies an arbitrary patch of VenusNode properties at once. */
  update(patch: Partial<VenusNode>): void {
    this.venus.update(this.id, patch)
  }

  /** Sets both x and y in one store update. */
  setPosition(x: number, y: number): void {
    this.venus.update(this.id, {x, y} as Partial<VenusNode>)
  }

  /** Sets both width and height in one store update. */
  setSize(width: number, height: number): void {
    this.venus.update(this.id, {width, height} as Partial<VenusNode>)
  }
}

// ── Rect ──────────────────────────────────────────────────────────────────────

export class VenusRectProxy extends VenusNodeProxy {
  get cornerRadius(): number { return this.raw?.cornerRadius ?? 0 }
  set cornerRadius(value: number) { this.set('cornerRadius' as keyof VenusNode, value) }

  get cornerRadii(): {topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number} | undefined {
    return this.raw?.cornerRadii
  }
  set cornerRadii(value: {topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number} | undefined) {
    this.set('cornerRadii' as keyof VenusNode, value)
  }
}

// ── Ellipse ───────────────────────────────────────────────────────────────────

export class VenusEllipseProxy extends VenusNodeProxy {
  get startAngle(): number { return this.raw?.ellipseStartAngle ?? 0 }
  set startAngle(value: number) { this.set('ellipseStartAngle' as keyof VenusNode, value) }

  get endAngle(): number { return this.raw?.ellipseEndAngle ?? 360 }
  set endAngle(value: number) { this.set('ellipseEndAngle' as keyof VenusNode, value) }

  get drawWedgeLine(): boolean { return this.raw?.ellipseDrawWedgeLine ?? false }
  set drawWedgeLine(value: boolean) { this.set('ellipseDrawWedgeLine' as keyof VenusNode, value) }

  /** Ellipse geometry in center+radii form. Preferred over x/y/width/height. */
  get ellipseGeometry(): { cx: number; cy: number; rx: number; ry: number } | undefined {
    return this.raw?.ellipseGeometry
  }
  set ellipseGeometry(value: { cx: number; cy: number; rx: number; ry: number } | undefined) {
    this.set('ellipseGeometry' as keyof VenusNode, value)
  }
}

// ── Line ──────────────────────────────────────────────────────────────────────

export class VenusLineProxy extends VenusNodeProxy {}

// ── Text ──────────────────────────────────────────────────────────────────────

export class VenusTextProxy extends VenusNodeProxy {
  get text(): string { return this.raw?.text ?? '' }
  set text(value: string) { this.set('text' as keyof VenusNode, value) }

  get fontSize(): number { return this.raw?.fontSize ?? 16 }
  set fontSize(value: number) { this.set('fontSize' as keyof VenusNode, value) }

  get fontWeight(): number { return this.raw?.fontWeight ?? 400 }
  set fontWeight(value: number) { this.set('fontWeight' as keyof VenusNode, value) }

  get lineHeight(): number { return this.raw?.lineHeight ?? 1.2 }
  set lineHeight(value: number) { this.set('lineHeight' as keyof VenusNode, value) }
}

// ── Group ─────────────────────────────────────────────────────────────────────

export class VenusGroupProxy extends VenusNodeProxy {
  addChild(child: VenusNode): VenusNodeProxy {
    return this.venus.addChild(this.id, child)
  }

  removeChild(childId: string): void {
    this.venus.removeChild(this.id, childId)
  }

  ungroup(): VenusNodeProxy[] {
    return this.venus.ungroup(this.id)
  }
}

// ── Clip / Mask ───────────────────────────────────────────────────────────────

export class VenusClipProxy extends VenusGroupProxy {}
export class VenusMaskProxy extends VenusGroupProxy {}

// ── Polygon ───────────────────────────────────────────────────────────────────

export class VenusPolygonProxy extends VenusNodeProxy {
  get points(): Array<{x: number; y: number}> | undefined { return this.raw?.points }
  set points(value: Array<{x: number; y: number}> | undefined) { this.set('points' as keyof VenusNode, value) }

  get closed(): boolean { return this.raw?.closed ?? true }
  set closed(value: boolean) { this.set('closed' as keyof VenusNode, value) }
}

// ── Path ──────────────────────────────────────────────────────────────────────

export class VenusPathProxy extends VenusNodeProxy {
  get points(): Array<{x: number; y: number}> | undefined { return this.raw?.points }
  set points(value: Array<{x: number; y: number}> | undefined) { this.set('points' as keyof VenusNode, value) }

  get bezierPoints(): Array<{anchor: {x: number; y: number}; cp1?: {x: number; y: number} | null; cp2?: {x: number; y: number} | null}> | undefined {
    return this.raw?.bezierPoints
  }
  set bezierPoints(value: Array<{anchor: {x: number; y: number}; cp1?: {x: number; y: number} | null; cp2?: {x: number; y: number} | null}> | undefined) {
    this.set('bezierPoints' as keyof VenusNode, value)
  }

  get closed(): boolean { return this.raw?.closed ?? false }
  set closed(value: boolean) { this.set('closed' as keyof VenusNode, value) }

  get startArrowhead(): 'none' | 'triangle' | 'diamond' | 'circle' | 'bar' | undefined {
    return this.raw?.strokeStartArrowhead
  }
  set startArrowhead(value: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar' | undefined) {
    this.set('strokeStartArrowhead' as keyof VenusNode, value)
  }

  get endArrowhead(): 'none' | 'triangle' | 'diamond' | 'circle' | 'bar' | undefined {
    return this.raw?.strokeEndArrowhead
  }
  set endArrowhead(value: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar' | undefined) {
    this.set('strokeEndArrowhead' as keyof VenusNode, value)
  }

  /** Anchor points for path geometry. Preferred over bezierPoints/points. */
  get anchorPoints(): Array<{ x: number; y: number; cp1?: { x: number; y: number } | null; cp2?: { x: number; y: number } | null }> | undefined {
    return this.raw?.anchorPoints
  }
  set anchorPoints(value: Array<{ x: number; y: number; cp1?: { x: number; y: number } | null; cp2?: { x: number; y: number } | null }> | undefined) {
    this.set('anchorPoints' as keyof VenusNode, value)
  }
}

// ── Image ─────────────────────────────────────────────────────────────────────

export class VenusImageProxy extends VenusNodeProxy {
  get assetId(): string { return this.raw?.assetId ?? '' }
  set assetId(value: string) { this.set('assetId' as keyof VenusNode, value) }

  get smoothing(): boolean { return this.raw?.imageSmoothing ?? true }
  set smoothing(value: boolean) { this.set('imageSmoothing' as keyof VenusNode, value) }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/** Creates the appropriate proxy subclass for a given Venus node type and id. */
export function createVenusNodeProxy(venus: Venus, id: string, type: VenusDocumentModelType): VenusNodeProxy {
  switch (type) {
    case 'rect': return new VenusRectProxy(venus, id, type)
    case 'ellipse': return new VenusEllipseProxy(venus, id, type)
    case 'line': return new VenusLineProxy(venus, id, type)
    case 'text': return new VenusTextProxy(venus, id, type)
    case 'group': return new VenusGroupProxy(venus, id, type)
    case 'clip': return new VenusClipProxy(venus, id, type)
    case 'mask': return new VenusMaskProxy(venus, id, type)
    case 'polygon': return new VenusPolygonProxy(venus, id, type)
    case 'path': return new VenusPathProxy(venus, id, type)
    case 'image': return new VenusImageProxy(venus, id, type)
    default: return new VenusNodeProxy(venus, id, type)
  }
}
