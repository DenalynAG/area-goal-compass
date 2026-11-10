 # Architecture

- Leader Pass dashboard uses directory profiles and each organizational unit's assigned leader ID for individual rows, without additional profile queries or changes to aggregate leader metrics.
- Total KPI uses the shared target aggregation helper for its read-only target, traffic light, and progress so the displayed and compared totals cannot diverge.