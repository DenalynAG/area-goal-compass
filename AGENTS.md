 # Architecture

- Leader Pass dashboard uses directory profiles and each organizational unit's assigned leader ID for individual rows, without additional profile queries or changes to aggregate leader metrics.
- Total KPI uses a shared target helper: target sums February–November when the KPI calc method is sum (or a per-KPI target override), otherwise uses the monthly target (latest February–November override or base); target, traffic light and progress share the result.
- Area and owner progress use a shared indicator-level average scoped by objective IDs, so objectives with different indicator counts do not distort the consolidation.
- KPI row traffic lights and displayed compliance share the same performance-ratio helper, including inverse indicators; objective and general-average labels use the same percentage-status helper to prevent conflicting classifications.
- KPI month eligibility uses a shared helper for forms, inline saves, imports and lock controls, with a database CHECK constraint as the final guard against excluded periods.
- Actual KPI aggregation uses calendar-string month matching, never local Date parsing, so Bogotá cannot shift first-of-month records; Total averages ten February–November months and dashboard cutoffs share the helper.
- Rectangular radii resolve through the global radius token; global control selectors cover legacy pill buttons while preserving native switch and radio shapes.