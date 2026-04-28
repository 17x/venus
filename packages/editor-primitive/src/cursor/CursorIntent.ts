/**
 * Defines canonical resize directions used by cursor mapping logic.
 */
export type ResizeDirection =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw'

/**
 * Defines canonical cursor intent contract shared by editor products.
 */
export type CursorIntent =
  | {type: 'default'}
  | {type: 'pointer'}
  | {type: 'move'}
  | {type: 'grab'}
  | {type: 'grabbing'}
  | {type: 'text'}
  | {type: 'crosshair'}
  | {type: 'not-allowed'}
  | {type: 'wait'}
  | {type: 'progress'}
  | {type: 'zoom-in'}
  | {type: 'zoom-out'}
  | {type: 'resize'; direction: ResizeDirection; rotation?: number}
  | {type: 'rotate'; angle?: number}
  | {type: 'custom'; css: string}

