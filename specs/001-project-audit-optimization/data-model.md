# Data Model: Project Audit & Optimization

## Entities

### AuditFinding

- Fields:
  - id (string, generated)
  - category (enum: setup, ssr, api, kv, ci, docs, performance)
  - description (string)
  - severity (enum: info, low, medium, high)
  - evidence (string or link reference)
  - recommendationId (string, optional)

### OptimizationRecommendation

- Fields:
  - id (string, generated)
  - relatedFindingIds (array of string ids)
  - action (string)
  - impact (enum: DX, performance, reliability, correctness)
  - effort (enum: trivial, low, medium, high)
  - status (enum: proposed, accepted, implemented, deferred)

### ValidationGateResult

- Fields:
  - gate (enum: setup, integration, deployment)
  - passed (boolean)
  - details (string)
  - timestamp (ISO8601)

## Relationships

- AuditFinding may link to one OptimizationRecommendation (many-to-one).
- OptimizationRecommendation aggregates multiple AuditFinding entries.
- ValidationGateResult entries stand alone but can be referenced in evidence for AuditFinding.

## Notes

- Persistence not implemented in this feature; model serves as conceptual structure for report outputs.
