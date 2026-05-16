# T0040 QoS Renderer Wiring

Status: In Progress

## Scope

- inject QoS budget into renderer context before frame execution
- align draw/upload/tile/cache lanes with effective QoS decision
- expose qos snapshot in diagnostics

## Acceptance

- runtime diagnostics include qos snapshot for each frame.
