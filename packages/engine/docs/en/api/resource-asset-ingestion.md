# Resource And Asset Ingestion API

Status: Release contract draft.
Scope: ENG-004.

Engine resource ingestion is generic. App adapters translate domain files into engine resources before submission.

## Generic Resource Families

- Geometry resources: mesh, primitive, polyline, point cloud, volume slice payload.
- Material resources: color, texture reference, transparency, render flags.
- Texture resources: image source, decode state, compression state, residency state.
- Animation resources: keyframe tracks, deterministic revision ids, playback ranges.
- Volume resources: scalar fields, slice descriptors, transfer function handles.

## Required Diagnostics

Resource APIs must report decode failure, fallback backend, compression support, residency pressure, and upload budget decisions without using industry-specific names.

## Scenario Coverage Target

This API family must support playground scenarios S1, S3, S4, S5, S7, S8, S9, S10, and S11 through app-owned adapters.
