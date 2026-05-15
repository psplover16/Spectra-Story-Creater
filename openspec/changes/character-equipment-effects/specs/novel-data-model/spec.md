## ADDED Requirements

### Requirement: Character file includes an equipment list with per-character effect overrides

The Character file SHALL include an `equipment` field of type `EquipmentItem[]`. Each `EquipmentItem` SHALL carry an `id`, a `name`, a `kind` chosen from `wearable` / `consumable` / `misc`, a `defaultEffect` string, and an `overrides` map from character id to effect string. The `overrides` map's value semantics SHALL be: when the key is the holding character's id and the value is a non-empty string, that value overrides `defaultEffect` for that character; when the value is an empty string, the equipment SHALL be treated as having no effect for that character; when the holding character's id is absent from the map, `defaultEffect` applies.

#### Scenario: Equipment record persists with default and overrides on disk

- **GIVEN** a character "韋小寶" with one equipment item `{ id: "eq-1", name: "玉佩", kind: "wearable", defaultEffect: "飾品", overrides: { "wei-id": "康熙親賜信物" } }`
- **WHEN** the character file is written
- **THEN** the JSON on disk SHALL contain an `equipment` array with one element whose fields exactly match the input, including the nested `overrides` map

#### Scenario: Equipment with empty-string override is preserved as "no effect"

- **GIVEN** an equipment item whose `overrides` contains `{ "茅十八-id": "" }`
- **WHEN** the character file is written and then read back
- **THEN** the read-back equipment item SHALL preserve `overrides["茅十八-id"] === ""`, encoding "明確無效果" for that character

### Requirement: characterRepository in-place migration backfills missing equipment fields

The characterRepository SHALL apply in-place migration when reading a character file: if `equipment` is missing or not an array, it SHALL be replaced with `[]` silently. If individual `EquipmentItem` entries are missing `id`, `kind`, `defaultEffect`, or `overrides`, the missing fields SHALL be backfilled with safe defaults (`id = "eq-<timestamp>-<index>"`, `kind = "misc"`, `defaultEffect = ""`, `overrides = {}`) and the repository SHALL emit a warn-level log per backfilled field; the read SHALL NOT throw an exception in any of these cases.

#### Scenario: Pre-existing character file without equipment is upgraded on read

- **GIVEN** a character file written before this change, containing no `equipment` field
- **WHEN** characterRepository reads that file
- **THEN** the resulting Character object SHALL have `equipment = []` and the repository SHALL NOT emit a warn for the missing top-level field

#### Scenario: Dirty equipment item is normalized with warnings

- **GIVEN** a character file whose `equipment[0]` is `{ name: "毒藥" }` with no `id`, `kind`, `defaultEffect`, or `overrides`
- **WHEN** characterRepository reads that file
- **THEN** the resulting `EquipmentItem` SHALL have `id` matching `/^eq-\d+-0$/`, `kind === "misc"`, `defaultEffect === ""`, `overrides` deeply equal `{}`, and the repository SHALL emit one warn-level log per missing field

### Requirement: characterRepository always writes the equipment field

The characterRepository SHALL always include the `equipment` field in the JSON output, even when the array is empty. The file SHALL remain UTF-8 without BOM and SHALL be written through the existing `.tmp` plus rename atomic flow.

#### Scenario: Empty equipment array is persisted

- **GIVEN** a Character object with `equipment = []`
- **WHEN** characterRepository writes the file
- **THEN** the JSON on disk SHALL contain `"equipment": []`, and re-reading SHALL produce an identical `equipment` array
