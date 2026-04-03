import ElementEllipse from '~/elements/ellipse/ellipse'
import {BezierPoint} from '~/elements/props'
import {Point} from '~/type'
import {nid} from '~/index'

export default function ellipseToBezierPoints(ellipse: ElementEllipse): BezierPoint[] {
  if (!ellipse) {
    throw new Error('Ellipse is null or undefined');
  }

  const { cx, cy, r1, r2, rotation = 0, startAngle = 0, endAngle = 360 } = ellipse;
  if (r1 <= 0 || r2 <= 0) {
    throw new Error('Radii must be positive numbers');
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const rotationRad = toRad(rotation);
  let startRad = toRad(startAngle);
  let endRad = toRad(endAngle);

  if (endRad <= startRad) endRad += 2 * Math.PI;

  const maxSeg = Math.PI / 2;
  const totalAngle = endRad - startRad;
  const segCount = Math.ceil(totalAngle / maxSeg);
  const segAngle = totalAngle / segCount;

  function rotate(p: Point, angle: number, center: Point): Point {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = p.x - center.x, dy = p.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  }

  function ellipseAt(angle: number): Point {
    return {
      x: cx + r1 * Math.cos(angle),
      y: cy + r2 * Math.sin(angle),
    };
  }

  function getHandles(a1: number, a2: number): { cp1: Point, cp2: Point } {
    const delta = a2 - a1;
    const alpha = (4 / 3) * Math.tan(delta / 4);
    const p1 = ellipseAt(a1);
    const p2 = ellipseAt(a2);
    const dx1 = -r1 * Math.sin(a1), dy1 = r2 * Math.cos(a1);
    const dx2 = -r1 * Math.sin(a2), dy2 = r2 * Math.cos(a2);
    return {
      cp1: { x: p1.x + alpha * dx1, y: p1.y + alpha * dy1 },
      cp2: { x: p2.x - alpha * dx2, y: p2.y - alpha * dy2 },
    };
  }

  const points: BezierPoint[] = [];

  // All intermediate points between startAngle and endAngle are symmetric and smooth,
  // with handles properly joined between segments. Avoid duplicating the last anchor.
  for (let i = 0; i < segCount; i++) {
    const a1 = startRad + i * segAngle;
    const a2 = Math.min(startRad + (i + 1) * segAngle, endRad);
    const p1 = rotate(ellipseAt(a1), rotationRad, { x: cx, y: cy });
    const p2 = rotate(ellipseAt(a2), rotationRad, { x: cx, y: cy });
    const { cp1, cp2 } = getHandles(a1, a2);
    const rcp1 = rotate(cp1, rotationRad, { x: cx, y: cy });
    const rcp2 = rotate(cp2, rotationRad, { x: cx, y: cy });

    const isFirst = i === 0;
    const isLast = i === segCount - 1;

    if (isFirst) {
      points.push({
        id: nid(),
        anchor: p1,
        cp1: null,
        cp2: rcp1,
        type: 'smooth',
        symmetric: true,
      });
    } else {
      points.push({
        id: nid(),
        anchor: p1,
        cp1: points[points.length - 1].cp2,
        cp2: rcp1,
        type: 'smooth',
        symmetric: true,
      });
    }

    // Only add the last anchor if it's not already present (avoid duplication)
    if (isLast) {
      points.push({
        id: nid(),
        anchor: p2,
        cp1: rcp2,
        cp2: null,
        type: 'smooth',
        symmetric: true,
      });
    }
  }

  return points;
}