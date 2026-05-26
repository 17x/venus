/**
 * Declares one undo/redo command for 3D scene operations.
 */
export interface EngineUndoCommand {
  /** Unique command identifier. */
  id: string;
  /** Human-readable command description. */
  description: string;
  /** Timestamp when the command was executed. */
  timestamp: number;
  /** Serialized inverse operation for undo. */
  inversePayload: Record<string, unknown>;
  /** Serialized forward operation for redo. */
  forwardPayload: Record<string, unknown>;
}

/**
 * Declares the undo/redo command stack for 3D operations.
 */
export interface EngineUndoRedoStack {
  /** Pushes one command onto the stack and clears the redo history. */
  push(command: EngineUndoCommand): void;
  /** Undoes the last command if available. Returns the undone command or null. */
  undo(): EngineUndoCommand | null;
  /** Redoes the last undone command if available. Returns the redone command or null. */
  redo(): EngineUndoCommand | null;
  /** Returns whether undo is available. */
  canUndo(): boolean;
  /** Returns whether redo is available. */
  canRedo(): boolean;
  /** Returns the current undo stack depth. */
  getUndoDepth(): number;
  /** Clears the entire undo/redo history. */
  clear(): void;
}

/**
 * Creates an undo/redo command stack with a configurable maximum depth.
 * @param maxDepth Maximum number of undo commands to retain.
 */
export function createEngineUndoRedoStack(maxDepth = 256): EngineUndoRedoStack {
  const undoStack: EngineUndoCommand[] = [];
  const redoStack: EngineUndoCommand[] = [];

  return {
    push: (command) => {
      undoStack.push(command);
      redoStack.length = 0;
      while (undoStack.length > maxDepth) {
        undoStack.shift();
      }
    },
    undo: () => {
      const cmd = undoStack.pop();
      if (cmd) {
        redoStack.push(cmd);
        return cmd;
      }
      return null;
    },
    redo: () => {
      const cmd = redoStack.pop();
      if (cmd) {
        undoStack.push(cmd);
        return cmd;
      }
      return null;
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    getUndoDepth: () => undoStack.length,
    clear: () => {
      undoStack.length = 0;
      redoStack.length = 0;
    },
  };
}
