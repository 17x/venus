# T0022 Auto Quality Scaler v1

Status: In Progress

## Inputs

- pressure tier
- current render scale
- min/max render scale bounds
- cooldown window

## Output

- next render scale
- decision reason
- whether adjustment occurred

## Acceptance

- scale shrinks under sustained high pressure.
- scale recovers after pressure drops and cooldown passes.
