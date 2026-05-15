## MODIFIED Requirements

### Requirement: Character editor exposes an equipment authoring section

The CharacterEditor SHALL render a dedicated "裝備" section that lists the equipment references currently attached to the character. Each row SHALL display the referenced equipment's name and kind by joining the reference's `equipmentId` against the equipment library passed in as a prop, plus three editable controls for that row: a textarea for `realEffect`, a textarea for `extraEffect`, and a remove button. The editor SHALL also expose a control to add a new reference by selecting an equipment item from the library; the editor SHALL NOT allow inline creation of new equipment items (that is the EquipmentTab's responsibility).

#### Scenario: User adds an equipment reference to the character

- **GIVEN** the equipment library contains an item `{ id: "eq-yu", name: "玉佩", kind: "wearable", defaultEffect: "飾品" }` and the editor is editing "韋小寶"
- **WHEN** the user opens the "新增裝備引用" control, selects `eq-yu`, and submits the form
- **THEN** the editor SHALL emit a `save` event whose payload `equipment` array contains one element `{ equipmentId: "eq-yu" }` with both `realEffect` and `extraEffect` absent

#### Scenario: User removes an existing reference

- **GIVEN** the editor is opened with a character holding two references A and B
- **WHEN** the user clicks the remove control on reference A and submits the form
- **THEN** the emitted payload `equipment` array SHALL contain only reference B, with B's fields unchanged

### Requirement: Character editor supports per-character override authoring

For each equipment reference, CharacterEditor SHALL allow the user to supply `realEffect` and `extraEffect` strings. Each of the two fields SHALL be settable to: absent (no override), a non-empty string, or an empty string (explicitly "no real effect" / "no extra effect"). The editor SHALL provide a toggle control for each field that, when checked, sets that field to the empty string, distinct from the case where the field is absent.

#### Scenario: User supplies a non-empty realEffect

- **GIVEN** a character editing 韋小寶 holding `{ equipmentId: "eq-yu" }`
- **WHEN** the user types "康熙親賜信物" into the realEffect textarea for that row and submits
- **THEN** the emitted payload SHALL contain `{ equipmentId: "eq-yu", realEffect: "康熙親賜信物" }`, and the `extraEffect` field SHALL remain absent

#### Scenario: User supplies a non-empty extraEffect alongside an existing realEffect

- **GIVEN** the same row from the previous scenario, where the user already entered "康熙親賜信物" as realEffect
- **WHEN** the user types "進宮免搜身" into the extraEffect textarea and submits
- **THEN** the emitted payload SHALL contain `{ equipmentId: "eq-yu", realEffect: "康熙親賜信物", extraEffect: "進宮免搜身" }`

#### Scenario: User marks realEffect as explicitly empty via toggle

- **WHEN** the user checks the "明確無真正效果" toggle on a row and submits without typing any text into the realEffect textarea
- **THEN** the emitted payload SHALL contain `realEffect: ""` for that reference, and SHALL NOT have `realEffect` absent

#### Scenario: User marks extraEffect as explicitly empty via toggle

- **WHEN** the user checks the "明確無額外效果" toggle on a row and submits
- **THEN** the emitted payload SHALL contain `extraEffect: ""` for that reference

### Requirement: Character editor displays dangling references as deleted

When CharacterEditor encounters an equipment reference whose `equipmentId` does not appear in the equipment library prop, the editor SHALL render that row with a "（已刪除：<equipmentId>）" indicator and SHALL still allow the user to remove that reference. The editor SHALL NOT remove dangling references automatically on load.

#### Scenario: Dangling reference is shown with deletion indicator

- **GIVEN** a character holding `{ equipmentId: "eq-removed" }` while the equipment library passed to the editor does not contain `eq-removed`
- **WHEN** the editor renders
- **THEN** the row for that reference SHALL contain the literal text "（已刪除：eq-removed）" and SHALL include a working remove control

#### Scenario: Removing a dangling reference clears it from save payload

- **GIVEN** the dangling row from the previous scenario
- **WHEN** the user clicks the remove control on that row and submits
- **THEN** the emitted payload `equipment` SHALL no longer contain a reference with `equipmentId === "eq-removed"`
