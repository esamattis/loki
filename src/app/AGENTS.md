# Loki Application

Application code imports reusable infrastructure from `@/core`; do not duplicate
core utilities or components.

"Jump items" are gear, locations, aircraft, and jump types assignable to a jump.

Logbook edit forms use specific unsaved-change titles, for example
`data-loki-confirm="Edit Jump"`. Keep jump numbering, units, statistics,
transfer, image reading, and Loki preference behavior under `src/app`.

Routes and tables for jumps, aircraft, gear, jump types, locations, statistics,
transfers, and image reading belong to the Loki layer. Core callbacks receive
only their documented concrete inputs and must not be expanded into registries.
