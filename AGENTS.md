 # Architecture

- Leader Pass dashboard uses directory profiles and each organizational unit's assigned leader ID for individual rows, without additional profile queries or changes to aggregate leader metrics.
- Total KPI uses a shared monthly-target helper (latest saved February–November override, otherwise base target) for its read-only target, traffic light, and progress so displayed and compared targets cannot diverge; real-value aggregation remains independent.
- Area and owner progress use a shared indicator-level average scoped by objective IDs, so objectives with different indicator counts do not distort the consolidation.
- KPI row traffic lights and displayed compliance share the same performance-ratio helper, including inverse indicators; objective and general-average labels use the same percentage-status helper to prevent conflicting classifications.
- KPI month eligibility uses a shared helper for forms, inline saves, imports and lock controls, with a database CHECK constraint as the final guard against excluded periods.
- Rectangular radii resolve through the global radius token; global control selectors cover legacy pill buttons while preserving native switch and radio shapes.