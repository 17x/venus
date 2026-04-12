/// <reference lib="webworker" />

import { bindEditorWorkerScope } from '@venus/runtime/worker'

bindEditorWorkerScope(self as DedicatedWorkerGlobalScope)
