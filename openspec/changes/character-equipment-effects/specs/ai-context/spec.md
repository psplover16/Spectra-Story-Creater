## ADDED Requirements

### Requirement: CharacterSlice carries resolved equipment for the holding character

The CharacterSlice produced by ContextAssembler SHALL include an `equipment` field of type `ResolvedEquipment[]`. For each equipment item the character holds, ContextAssembler SHALL compute one `ResolvedEquipment` whose `effect` and `hasEffect` are derived as follows: if the holding character's id appears in `EquipmentItem.overrides`, the override value SHALL be used (`effect = overrides[charId]`, `hasEffect = overrides[charId] !== ""`); otherwise, `defaultEffect` SHALL be used (`effect = defaultEffect`, `hasEffect = defaultEffect !== ""`).

#### Scenario: Override with non-empty effect is applied

- **GIVEN** a character "韋小寶" with id `wei-id` holding an equipment item `{ name: "玉佩", kind: "wearable", defaultEffect: "飾品", overrides: { "wei-id": "康熙親賜信物" } }`
- **WHEN** ContextAssembler assembles the slice for the chapter where 韋小寶 is present
- **THEN** the CharacterSlice for 韋小寶 SHALL contain an equipment entry with `effect === "康熙親賜信物"` and `hasEffect === true`

#### Scenario: Absent override falls through to default effect

- **GIVEN** a character with id `mao-id` holding the same "玉佩" item, where `overrides` contains no `mao-id` key
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice for that character SHALL contain an equipment entry with `effect === "飾品"` and `hasEffect === true`

#### Scenario: Explicit no-effect override yields hasEffect false

- **GIVEN** a character with id `mao-id` holding an item where `overrides["mao-id"] === ""`
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice for that character SHALL contain an equipment entry with `effect === ""` and `hasEffect === false`

### Requirement: Prompt builder injects an equipment sub-list under each character entry

The `buildPrompt` function SHALL render, beneath each character line in the "# 2. 角色" section, a "持有裝備：" sub-list when the character's CharacterSlice has at least one `ResolvedEquipment`. Each equipment entry SHALL render as one bullet line containing the equipment name, its kind in parentheses, and the resolved effect: when `hasEffect` is true, the effect string SHALL appear after a colon; when `hasEffect` is false, the bullet SHALL render the phrase "（對該角色無特殊效果）" instead of the effect string. When a character holds no equipment, no sub-list SHALL appear and no empty heading SHALL be rendered.

#### Scenario: Effective equipment renders effect string

- **GIVEN** a CharacterSlice whose equipment list contains one item `{ name: "玉佩", kind: "wearable", effect: "康熙親賜信物", hasEffect: true }`
- **WHEN** `buildPrompt` renders the character section
- **THEN** the prompt SHALL include a bullet line for that character containing the text `玉佩` and the text `wearable` and the text `康熙親賜信物`, all nested under that character's heading

#### Scenario: No-effect equipment renders fixed phrase

- **GIVEN** a CharacterSlice whose equipment list contains one item with `hasEffect: false`
- **WHEN** `buildPrompt` renders the character section
- **THEN** the bullet line for that item SHALL include the literal text `（對該角色無特殊效果）` and SHALL NOT include the empty effect string

#### Scenario: Character without equipment has no sub-list

- **GIVEN** a CharacterSlice whose equipment list is empty
- **WHEN** `buildPrompt` renders the character section
- **THEN** the prompt SHALL NOT contain the literal text `持有裝備：` under that character's heading
