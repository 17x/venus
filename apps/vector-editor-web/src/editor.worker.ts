/// <reference lib="webworker" />

import { bindEditorWorkerScope } from '@vector/runtime/worker'

bindEditorWorkerScope(self as DedicatedWorkerGlobalScope)
