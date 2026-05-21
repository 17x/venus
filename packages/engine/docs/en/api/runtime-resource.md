# Runtime Resource API

Status: beta
Level: foundation

## Endpoints

1. `engine.runtime.resource.register(descriptor)`
2. `engine.runtime.resource.update(resourceId, patch)`
3. `engine.runtime.resource.release(resourceId)`
4. `engine.runtime.resource.pin(resourceId)`
5. `engine.runtime.resource.unpin(resourceId)`
6. `engine.runtime.resource.getResidency(resourceId)`
7. `engine.runtime.resource.collectGarbage(options)`

## Error Codes

1. `ENGINE_RESOURCE_INVALID_DESCRIPTOR`
2. `ENGINE_RESOURCE_NOT_FOUND`

## Determinism

For identical inputs and registry state, resource outputs are deterministic.
