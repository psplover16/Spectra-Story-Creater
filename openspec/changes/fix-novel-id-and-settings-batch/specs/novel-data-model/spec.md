## MODIFIED Requirements

### Requirement: Character file structure

The system SHALL persist each character of a novel as one JSON file under `<novel>/characters/<character-id>.json`, with required fields `id`, `name`, `personality`, `abilities[]`, `appearance`, `factionIds[]`, `socialStatus`, `relationships[]`, `notes`, `createdAt`, `updatedAt`. The `factionIds` field SHALL hold zero or more faction ids and SHALL allow a character to belong to multiple factions simultaneously. The system SHALL accept legacy character files that carry the singular `factionId` string field and SHALL migrate them in memory on read; on the next write of any such file the legacy `factionId` field SHALL be removed from disk.

#### Scenario: Create a character

- **WHEN** the user creates a character named "韋小寶" in novel "鹿鼎記"
- **THEN** the system writes `D:/Novels/鹿鼎記/characters/<generated-id>.json` containing the required fields, with empty arrays for `abilities`, `factionIds`, and `relationships` when not supplied

#### Scenario: Reject character without name

- **WHEN** the user tries to save a character with an empty or missing `name`
- **THEN** the system rejects the request with `SchemaValidationError` naming the missing field

#### Scenario: Migrate legacy factionId on read

- **WHEN** the system reads a character file whose stored object contains the legacy field `factionId` and does not contain `factionIds`
- **THEN** the in-memory character object SHALL expose `factionIds` as a single-element array when `factionId` is a non-empty string, or as an empty array when `factionId` is `null` or absent, and the legacy field SHALL NOT be exposed to downstream callers

##### Example: legacy migration values

| Stored `factionId` | Stored `factionIds` | In-memory `factionIds` after read |
| ------------------ | ------------------- | --------------------------------- |
| "f-abc"            | absent              | ["f-abc"]                         |
| null               | absent              | []                                |
| absent             | absent              | []                                |
| "f-abc"            | ["f-abc", "f-xyz"]  | ["f-abc", "f-xyz"]                |

#### Scenario: Remove legacy field on next write

- **WHEN** the system writes a character file whose in-memory object carries `factionIds`
- **THEN** the on-disk JSON SHALL contain `factionIds` and SHALL NOT contain the legacy `factionId` field
