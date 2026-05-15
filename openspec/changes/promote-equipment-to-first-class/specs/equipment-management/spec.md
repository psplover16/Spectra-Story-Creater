## ADDED Requirements

### Requirement: Equipment is stored as a first-class entity per novel

Each piece of equipment SHALL be stored as a first-class entity in `<novel>/equipment/<id>.json`, parallel to the existing `characters/`, `chapters/`, and `factions/` subdirectories. The file SHALL be encoded as UTF-8 without BOM and SHALL contain an `EquipmentItem` with `id`, `name`, `kind` (one of `wearable`, `consumable`, `misc`), `defaultEffect`, and an optional `notes` field. The equipment SHALL NOT carry per-character override fields; per-character augmentation is the responsibility of `EquipmentReference` in the character file.

#### Scenario: Saving an equipment item creates its own file

- **GIVEN** a novel at `D:/Novels/鹿鼎記`
- **WHEN** the user creates an equipment item with `id = "eq-yu"`, `name = "玉佩"`, `kind = "wearable"`, `defaultEffect = "飾品"`
- **THEN** the file `D:/Novels/鹿鼎記/equipment/eq-yu.json` SHALL exist and contain exactly those five fields (plus an optional `notes` field if supplied), and SHALL NOT contain any `overrides` field

#### Scenario: Equipment file is UTF-8 without BOM

- **WHEN** the equipment file is written
- **THEN** the file bytes SHALL begin with the JSON `{` character and SHALL NOT begin with a UTF-8 BOM (`EF BB BF`)

### Requirement: Equipment repository exposes list, read, write, delete operations

The system SHALL provide a repository module that lists all equipment items in a novel, reads a single item by id, writes a new or updated item, and deletes an item. Write operations SHALL use a `.tmp` plus rename atomic pattern, matching the existing character and chapter repositories. Reads against a non-existent id SHALL return `null` rather than throwing.

#### Scenario: Round-trip through repository

- **GIVEN** an empty novel
- **WHEN** the system writes an equipment item with `id = "eq-yu"`, then lists, then reads by id
- **THEN** the listed array SHALL contain one item whose `id === "eq-yu"`, and the single read SHALL return the same fields as written

#### Scenario: Read of non-existent id returns null

- **WHEN** the system reads an equipment id that has never been written
- **THEN** the result SHALL be `null` and SHALL NOT throw

### Requirement: Equipment IPC channels mirror existing character/chapter/faction shape

The Electron main process SHALL register four IPC channels: `equipment:list(novelDir)`, `equipment:read(novelDir, id)`, `equipment:write(novelDir, item)`, and `equipment:delete(novelDir, id)`. The preload bridge SHALL expose them as `window.api.equipment.list / read / write / delete`. Channel argument and return shapes SHALL match the equipment repository function signatures.

#### Scenario: Renderer can list equipment via window.api

- **GIVEN** an equipment item has been written to a novel
- **WHEN** the renderer invokes `window.api.equipment.list(novelDir)`
- **THEN** the returned promise SHALL resolve to an array containing that item

#### Scenario: Renderer can delete equipment via window.api

- **WHEN** the renderer invokes `window.api.equipment.delete(novelDir, "eq-yu")`
- **THEN** the file `<novelDir>/equipment/eq-yu.json` SHALL no longer exist, and a subsequent `equipment:read` for that id SHALL return `null`

### Requirement: NovelView exposes an equipment tab parallel to chapters and factions

The NovelView SHALL render a tab labeled "裝備" that the user can click to switch to an `EquipmentTab` panel. The tab SHALL appear at the same level as the existing chapters, factions, worldview, and settings tabs, with `data-testid` `tab-equipment` and the panel testid `panel-equipment`.

#### Scenario: Equipment tab is reachable from any active novel

- **GIVEN** the user has an active novel open in NovelView
- **WHEN** the user clicks the tab with data-testid `tab-equipment`
- **THEN** the panel with data-testid `panel-equipment` SHALL become visible and SHALL contain the EquipmentTab content

### Requirement: EquipmentTab supports add, edit, delete CRUD on the equipment library

The EquipmentTab SHALL render the list of equipment items for the active novel and provide controls to add a new item, edit an existing item (name, kind, defaultEffect, notes), and delete an item. The displayed list SHALL refresh after each successful save or delete.

#### Scenario: User adds a new equipment item from the tab

- **WHEN** the user clicks the "新增裝備" control in EquipmentTab, fills in name, selects a kind, fills in defaultEffect, and submits
- **THEN** the system SHALL persist the new item via `equipment:write`, and the displayed list SHALL include the new item after the operation completes

#### Scenario: User deletes an equipment item from the tab

- **GIVEN** the equipment list contains one item with id `eq-yu`
- **WHEN** the user clicks the delete control on that row and confirms
- **THEN** `equipment:delete` SHALL be invoked with that id, the file SHALL be removed from disk, and the displayed list SHALL no longer include the item
