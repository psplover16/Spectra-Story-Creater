## ADDED Requirements

### Requirement: Novel meta file structure

The system SHALL persist each novel as a folder under the user-selected workspace root, with a `novel.json` file at the folder root storing the novel meta, worldview entries, faction summaries, and the overall plot outline.

#### Scenario: Create a new novel

- **WHEN** the user creates a novel named "鹿鼎記" in workspace `D:/Novels`
- **THEN** the system creates `D:/Novels/鹿鼎記/` containing `novel.json` with fields `id`, `name`, `style`, `worldview[]`, `factionsSummary[]`, `overallOutline`, `createdAt`, `updatedAt`

#### Scenario: Reject duplicate novel name

- **WHEN** the user creates a novel with a name that already exists as a folder under the workspace root
- **THEN** the system rejects the request with a `DuplicateNovelError` and does not modify the filesystem

### Requirement: Character file structure

The system SHALL persist each character of a novel as one JSON file under `<novel>/characters/<character-id>.json`, with required fields `id`, `name`, `personality`, `abilities[]`, `appearance`, `factionId`, `socialStatus`, `relationships[]`, `notes`, `createdAt`, `updatedAt`.

#### Scenario: Create a character

- **WHEN** the user creates a character named "韋小寶" in novel "鹿鼎記"
- **THEN** the system writes `D:/Novels/鹿鼎記/characters/<generated-id>.json` containing the required fields, with empty arrays for `abilities`, `relationships` when not supplied

#### Scenario: Reject character without name

- **WHEN** the user tries to save a character with an empty or missing `name`
- **THEN** the system rejects the request with `SchemaValidationError` naming the missing field

### Requirement: Chapter file structure with branches

The system SHALL persist each chapter as `<novel>/chapters/<chapter-id>.json` with required fields `id`, `index`, `title`, `outline`, `scene`, `content`, `presentCharacters[]`, `createdAt`, `updatedAt`. Branch versions of a chapter SHALL be stored under `<novel>/chapters/<chapter-id>.branches/<branch-id>.json` with the same schema plus a `branchOf` reference and a `branchedAt` timestamp.

#### Scenario: Save a chapter outline

- **WHEN** the user saves chapter 3 of "鹿鼎記" with outline "韋小寶誤入禁地"
- **THEN** the system writes `chapters/<chapter-id>.json` with `outline = "韋小寶誤入禁地"` and other fields preserved or initialized as empty

#### Scenario: Save a branch version

- **WHEN** the user saves a branch of chapter 3 named "alt-pov-茅十八"
- **THEN** the system writes `chapters/<chapter-id>.branches/<branch-id>.json` with `branchOf = <chapter-id>` and `branchedAt` set to current ISO 8601 timestamp

### Requirement: Faction file structure

The system SHALL persist each faction as `<novel>/factions/<faction-id>.json` with required fields `id`, `name`, `alignment`, `description`, `currentSituation`, `keyMembers[]`, `createdAt`, `updatedAt`.

#### Scenario: Update faction situation

- **WHEN** the user updates the `currentSituation` of faction "天地會" to "韋小寶加入後勢力大增"
- **THEN** the system rewrites `factions/<faction-id>.json` with the new `currentSituation` and refreshed `updatedAt`

### Requirement: All JSON files use UTF-8 without BOM

The system SHALL write every novel-related JSON file using UTF-8 encoding without a byte-order mark, and SHALL read files defensively by accepting both UTF-8 with and without BOM but rejecting other encodings with `EncodingError`.

#### Scenario: Read a UTF-8 file with BOM

- **WHEN** the system reads a JSON file that starts with the UTF-8 BOM bytes
- **THEN** the system strips the BOM and parses the JSON successfully

#### Scenario: Reject a file in non-UTF-8 encoding

- **WHEN** the system reads a JSON file whose bytes cannot be decoded as UTF-8
- **THEN** the system raises `EncodingError` and does not return partial data
