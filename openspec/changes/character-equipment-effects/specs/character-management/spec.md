## ADDED Requirements

### Requirement: Character editor exposes an equipment authoring section

The CharacterEditor SHALL render a dedicated "裝備" section that lists all equipment items currently attached to the character and lets the user add, edit, and remove items. Each row SHALL expose four editable controls: a text input for `name`, a select control for `kind` constrained to `wearable` / `consumable` / `misc`, a textarea for `defaultEffect`, and an overrides editor described in the next requirement. Removing an item from the list SHALL remove its entry from the saved character object without affecting the other items.

#### Scenario: User adds a new equipment item and saves the character

- **WHEN** the user clicks the "新增裝備" control inside CharacterEditor, fills in `name = "玉佩"`, `kind = "wearable"`, and `defaultEffect = "飾品"`, and submits the form
- **THEN** the editor SHALL emit a `save` event whose payload `equipment` array contains one item matching `{ name: "玉佩", kind: "wearable", defaultEffect: "飾品" }` with an automatically generated non-empty `id` and `overrides` equal to `{}`

#### Scenario: User removes an existing equipment item

- **GIVEN** the editor is opened with a character containing two equipment items A and B
- **WHEN** the user clicks the remove control on item A and submits the form
- **THEN** the emitted `save` event payload `equipment` array SHALL contain only item B, with item B's fields unchanged

### Requirement: Character editor supports per-character override authoring

For each equipment item, CharacterEditor SHALL allow the user to attach a per-character override: the user selects a character id from the list of characters known to the editor (excluding the holding character itself), supplies an effect string, and saves. Saving an override with a non-empty effect SHALL store that string under `overrides[targetCharId]`; saving with an explicit "明確無效果" toggle SHALL store an empty string under that key. Removing an override SHALL delete the entry from the `overrides` map.

#### Scenario: User adds an override with a non-empty effect string

- **GIVEN** the editor is editing 韋小寶 with one equipment item "玉佩" whose `overrides` is empty
- **WHEN** the user opens the overrides editor for that item, selects character id `kangxi-id`, enters effect "調兵符", and submits
- **THEN** the emitted `save` payload SHALL contain that item with `overrides["kangxi-id"] === "調兵符"` and other override entries untouched

#### Scenario: User marks an override as explicitly no-effect

- **WHEN** the user adds an override for character id `mao-id` and toggles the "明確無效果" control instead of typing text
- **THEN** the emitted `save` payload SHALL contain `overrides["mao-id"] === ""`, distinct from the case where `mao-id` is absent from the map

#### Scenario: User removes a previously saved override

- **GIVEN** an equipment item with `overrides = { "kangxi-id": "調兵符", "mao-id": "" }`
- **WHEN** the user clicks the remove control on the `kangxi-id` row and submits the form
- **THEN** the emitted `save` payload SHALL contain `overrides` deeply equal to `{ "mao-id": "" }`
