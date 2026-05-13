## ADDED Requirements

### Requirement: Character CRUD UI

The system SHALL provide a character management view in the active novel that lets the user list, create, read, update, and delete characters, each persisted as defined by the `novel-data-model` capability.

#### Scenario: Create character through UI

- **WHEN** the user fills in the character editor with name "韋小寶" and presses save
- **THEN** the system persists the new character file, refreshes the character list, and the new entry appears at the top of the list

#### Scenario: Delete character with chapter references

- **WHEN** the user deletes a character that is referenced in `presentCharacters[]` of one or more chapters
- **THEN** the system prompts the user to confirm and on confirmation removes the character file and strips the character id from every referencing chapter's `presentCharacters[]`

### Requirement: Required character fields

The system SHALL require `name` to be a non-empty string for any character save, and SHALL allow `personality`, `abilities`, `appearance`, `factionId`, `socialStatus`, `relationships`, and `notes` to be empty or unset.

#### Scenario: Save with only a name

- **WHEN** the user enters only the name "韋小寶" and saves
- **THEN** the system persists the character with default empty values for the other fields

#### Scenario: Save without a name

- **WHEN** the user leaves the name blank and presses save
- **THEN** the system blocks the save and shows a validation error pointing at the name field

### Requirement: Character relationship editing

The system SHALL allow the user to maintain relationships from a character to other characters in the same novel, storing each entry as `{ targetCharacterId, kind, description }` in the `relationships[]` array of the source character file.

#### Scenario: Add a relationship

- **WHEN** the user adds a relationship from "韋小寶" to "建寧公主" with kind "lover" and description "夫妻"
- **THEN** the system writes `{ targetCharacterId: <建寧公主id>, kind: "lover", description: "夫妻" }` into 韋小寶's `relationships[]`

#### Scenario: Prevent relationship to non-existent character

- **WHEN** the user attempts to save a relationship whose `targetCharacterId` does not exist among the novel's characters
- **THEN** the system rejects the save with `SchemaValidationError`

### Requirement: Character list filtering by faction

The system SHALL allow the user to filter the character list by `factionId`, including a "no faction" filter, returning only characters whose `factionId` matches the selected value.

#### Scenario: Filter to a specific faction

- **WHEN** the user filters by faction "天地會" and three of ten characters have `factionId` set to that faction
- **THEN** the character list shows exactly those three characters
