/// <reference lib="webworker" />

import { bindEditorWorkerScope } from '@venus/editor-worker'

bindEditorWorkerScope(self as DedicatedWorkerGlobalScope)
