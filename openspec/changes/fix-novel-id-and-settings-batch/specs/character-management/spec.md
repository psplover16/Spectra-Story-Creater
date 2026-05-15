## MODIFIED Requirements

### Requirement: Required character fields

The system SHALL require `name` to be a non-empty string for any character save, and SHALL allow `personality`, `abilities`, `appearance`, `factionIds`, `socialStatus`, `relationships`, and `notes` to be empty or unset. The `factionIds` field SHALL be an array containing zero or more faction ids, each id referring to a faction in the same novel.

#### Scenario: Save with only a name

- **WHEN** the user enters only the name "韋小寶" and saves
- **THEN** the system persists the character with default empty values for the other fields, including `factionIds` as an empty array

#### Scenario: Save without a name

- **WHEN** the user leaves the name blank and presses save
- **THEN** the system blocks the save and shows a validation error pointing at the name field

### Requirement: Character list filtering by faction

The system SHALL allow the user to filter the character list by faction id, including a "no faction" filter that selects characters whose `factionIds` array is empty. The system SHALL include a character in the membership list of a given faction if and only if that faction id is contained in the character's `factionIds` array.

#### Scenario: Filter to a specific faction

- **WHEN** the user filters by faction "天地會" and three of ten characters have "天地會" in their `factionIds`
- **THEN** the character list shows exactly those three characters, including any character whose `factionIds` also contains other faction ids

#### Scenario: Filter to characters with no faction

- **WHEN** the user selects the "no faction" filter
- **THEN** the character list shows exactly those characters whose `factionIds` array is empty
