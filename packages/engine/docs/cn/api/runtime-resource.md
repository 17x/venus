# Runtime Resource API

状态：beta
层级：foundation

## 接口

1. `engine.runtime.resource.register(descriptor)`
2. `engine.runtime.resource.update(resourceId, patch)`
3. `engine.runtime.resource.release(resourceId)`
4. `engine.runtime.resource.pin(resourceId)`
5. `engine.runtime.resource.unpin(resourceId)`
6. `engine.runtime.resource.getResidency(resourceId)`
7. `engine.runtime.resource.collectGarbage(options)`

## 错误码

1. `ENGINE_RESOURCE_INVALID_DESCRIPTOR`
2. `ENGINE_RESOURCE_NOT_FOUND`

## 确定性

在相同输入与相同 registry 状态下，resource 输出保持确定性。
