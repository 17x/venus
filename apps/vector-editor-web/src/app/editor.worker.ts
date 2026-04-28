/// <reference lib="webworker" />

import { bindEditorWorkerScope } from '../runtime/worker/index.ts'

bindEditorWorkerScope(self as DedicatedWorkerGlobalScope)
