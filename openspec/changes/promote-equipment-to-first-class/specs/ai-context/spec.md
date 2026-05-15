## MODIFIED Requirements

### Requirement: CharacterSlice carries resolved equipment for the holding character

The CharacterSlice produced by ContextAssembler SHALL include an `equipment` field of type `ResolvedEquipment[]`. ContextAssembler SHALL load the equipment library via a new `loadEquipment(novelDir): Promise<EquipmentItem[]>` dependency and join each `EquipmentReference` on the character to the corresponding `EquipmentItem`. For each successful join, ContextAssembler SHALL emit one `ResolvedEquipment` with the following fields derived from the join:

- `id`, `name`, `kind`: copied from the EquipmentItem
- `effect: string`: equals `reference.realEffect` if that field is defined (whether empty or non-empty), otherwise equals `equipmentItem.defaultEffect`
- `hasEffect: boolean`: equals `effect !== ""`
- `extraEffect: string`: equals `reference.extraEffect ?? ""`
- `hasExtra: boolean`: equals `reference.extraEffect !== undefined` (true even when extraEffect is the empty string)

When a reference's `equipmentId` does not appear in the equipment library, ContextAssembler SHALL emit one `console.warn` per dangling reference, skip that entry without emitting a `ResolvedEquipment`, and SHALL NOT throw an exception.

#### Scenario: Non-empty realEffect overrides defaultEffect

- **GIVEN** a character holding `{ equipmentId: "eq-yu", realEffect: "康熙親賜信物" }` and an equipment item `{ id: "eq-yu", name: "玉佩", kind: "wearable", defaultEffect: "飾品" }`
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice equipment entry SHALL have `effect === "康熙親賜信物"` and `hasEffect === true`

#### Scenario: Absent realEffect falls through to defaultEffect

- **GIVEN** a reference `{ equipmentId: "eq-yu" }` with realEffect absent, and the same equipment item as above
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice equipment entry SHALL have `effect === "飾品"` and `hasEffect === true`

#### Scenario: Explicit empty-string realEffect yields hasEffect false

- **GIVEN** a reference `{ equipmentId: "eq-yu", realEffect: "" }`
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice equipment entry SHALL have `effect === ""` and `hasEffect === false`

#### Scenario: Non-empty extraEffect surfaces with hasExtra true

- **GIVEN** a reference `{ equipmentId: "eq-yu", extraEffect: "進宮免搜身" }`
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice equipment entry SHALL have `extraEffect === "進宮免搜身"` and `hasExtra === true`

#### Scenario: Absent extraEffect yields hasExtra false

- **GIVEN** a reference where extraEffect is absent
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice equipment entry SHALL have `extraEffect === ""` and `hasExtra === false`

#### Scenario: Explicit empty-string extraEffect yields hasExtra true

- **GIVEN** a reference `{ equipmentId: "eq-yu", extraEffect: "" }`
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice equipment entry SHALL have `extraEffect === ""` and `hasExtra === true`

#### Scenario: Dangling reference is skipped with a console warning

- **GIVEN** a character holding `{ equipmentId: "eq-removed" }` while the equipment library does not contain that id
- **WHEN** ContextAssembler assembles the slice
- **THEN** the CharacterSlice equipment array SHALL NOT contain an entry derived from that reference, and one `console.warn` SHALL be emitted naming both the equipmentId and the character id

### Requirement: Prompt builder injects an equipment sub-list under each character entry

The `buildPrompt` function SHALL render, beneath each character line in the "# 2. 角色" section, a "持有裝備：" sub-list when the character's CharacterSlice has at least one `ResolvedEquipment`. For each equipment entry, the bullet rendering SHALL follow these rules:

- One line of the form `  - {name}（{kind}）：{effect_text}`, where `effect_text` is the equipment's `effect` when `hasEffect` is true, or the literal text `（明確標示無真正效果）` when `hasEffect` is false
- If `hasExtra` is true and `extraEffect` is non-empty, an additional indented line of the form `    - 額外效果：{extraEffect}` SHALL follow
- If `hasExtra` is true and `extraEffect` is the empty string, an additional indented line of the form `    - 額外效果：（明確標示無額外效果）` SHALL follow
- If `hasExtra` is false, no additional extra-effect line SHALL be rendered

When a character holds no equipment, no sub-list SHALL appear and no empty heading SHALL be rendered.

#### Scenario: Real effect with non-empty extra effect renders both lines

- **GIVEN** a CharacterSlice with one equipment entry `{ name: "玉佩", kind: "wearable", effect: "康熙親賜信物", hasEffect: true, extraEffect: "進宮免搜身", hasExtra: true }`
- **WHEN** `buildPrompt` renders the character section
- **THEN** the prompt SHALL contain the text `玉佩（wearable）：康熙親賜信物` and on a following line SHALL contain `額外效果：進宮免搜身`

#### Scenario: Empty real effect renders explicit-empty phrase, absent extra effect renders no extra line

- **GIVEN** a CharacterSlice with one equipment entry where `hasEffect = false` and `hasExtra = false`
- **WHEN** `buildPrompt` renders the character section
- **THEN** the prompt SHALL contain the literal text `（明確標示無真正效果）` for that item, and SHALL NOT contain the text `額外效果：` for that item

#### Scenario: Real effect from default, explicit-empty extra effect renders both forms

- **GIVEN** a CharacterSlice with one equipment entry `{ name: "玉佩", kind: "wearable", effect: "飾品", hasEffect: true, extraEffect: "", hasExtra: true }`
- **WHEN** `buildPrompt` renders the character section
- **THEN** the prompt SHALL contain the text `玉佩（wearable）：飾品` and on a following line SHALL contain the literal text `額外效果：（明確標示無額外效果）`

#### Scenario: Character without equipment has no sub-list

- **GIVEN** a CharacterSlice whose equipment list is empty
- **WHEN** `buildPrompt` renders the character section
- **THEN** the prompt SHALL NOT contain the literal text `持有裝備：` under that character's heading
