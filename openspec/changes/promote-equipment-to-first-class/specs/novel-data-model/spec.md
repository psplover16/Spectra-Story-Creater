## MODIFIED Requirements

### Requirement: Character file includes an equipment list with per-character effect overrides

The Character file SHALL include an `equipment` field of type `EquipmentReference[]`. Each `EquipmentReference` SHALL carry an `equipmentId` pointing to a first-class equipment file under `<novel>/equipment/<equipmentId>.json`, plus two optional fields `realEffect: string` and `extraEffect: string`. The Character file SHALL NOT embed the equipment name, kind, or defaultEffect; those live in the equipment file. The semantics of `realEffect` and `extraEffect` are three-state:

- field is `undefined`: defer to the upstream value (for `realEffect`, the equipment's `defaultEffect`; for `extraEffect`, render no extra effect)
- field is `""` (empty string): explicitly mark as "no value" (for `realEffect`, this character has no real effect even though the equipment has a default; for `extraEffect`, this character explicitly has no extra effect)
- field is a non-empty string: adopt that string as the real or extra effect

#### Scenario: Reference with realEffect and extraEffect persists on disk

- **GIVEN** a character "韋小寶" holding `{ equipmentId: "eq-yu", realEffect: "康熙親賜信物", extraEffect: "進宮免搜身" }`
- **WHEN** the character file is written and read back
- **THEN** the read-back character SHALL have an `equipment` array of length 1 whose only element deeply equals the input, and the file SHALL NOT contain the equipment's `name`, `kind`, or `defaultEffect` inline

#### Scenario: Reference with empty-string realEffect is preserved as explicit no-effect

- **GIVEN** an equipment reference whose `realEffect === ""`
- **WHEN** the character file is written and read back
- **THEN** the read-back reference SHALL preserve `realEffect === ""`, distinct from the case where the field is absent

### Requirement: characterRepository in-place migration backfills missing equipment fields

The characterRepository SHALL apply in-place migration when reading a character file. If `equipment` is missing or not an array, it SHALL be replaced with `[]` silently. If any element of the `equipment` array is missing the `equipmentId` field, OR contains any field belonging to the previous `EquipmentItem`-inline schema (`name`, `kind`, `defaultEffect`, or `overrides`), the repository SHALL discard the entire `equipment` array, replace it with `[]`, and emit one warn-level log per character file noting the BREAKING migration; the read SHALL NOT throw.

#### Scenario: Pre-equipment-effects character file is upgraded silently

- **GIVEN** a character file written before any equipment schema existed, containing no `equipment` field
- **WHEN** characterRepository reads that file
- **THEN** the resulting Character object SHALL have `equipment = []`, and the repository SHALL NOT emit a warn

#### Scenario: First-stage equipment-effects data is BREAKING-discarded with a warning

- **GIVEN** a character file written under the previous `character-equipment-effects` change, with `equipment` containing items shaped as `{ id, name, kind, defaultEffect, overrides }`
- **WHEN** characterRepository reads that file
- **THEN** the resulting Character object SHALL have `equipment = []`, and the repository SHALL emit one warn-level log identifying the character file and noting that prior `overrides`-shaped data has been discarded

#### Scenario: Reference with missing equipmentId is dropped with a warning

- **GIVEN** a character file whose `equipment` array contains one element `{ realEffect: "x" }` without an `equipmentId`
- **WHEN** characterRepository reads that file
- **THEN** the entire `equipment` array SHALL be replaced with `[]` and the repository SHALL emit a warn-level log
