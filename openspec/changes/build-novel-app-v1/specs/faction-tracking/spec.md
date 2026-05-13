## ADDED Requirements

### Requirement: Faction state CRUD

The system SHALL provide a faction management view in the active novel that lets the user list, create, read, update, and delete factions, each persisted as defined by the `novel-data-model` capability.

#### Scenario: Create faction

- **WHEN** the user creates faction "天地會" with alignment "正派" and description "反清復明"
- **THEN** the system writes `<novel>/factions/<faction-id>.json` with those values and the faction appears in the faction list

### Requirement: Update faction situation across chapters

The system SHALL allow the user to update a faction's `currentSituation` text field at any time, with each update timestamped via `updatedAt`. The system SHALL provide a one-line history view of past `currentSituation` values stored under `<novel>/factions/<faction-id>.history.jsonl`.

#### Scenario: Situation update appends history

- **GIVEN** faction "天地會" with `currentSituation = "勢力衰弱"`
- **WHEN** the user updates `currentSituation` to "韋小寶加入後勢力大增"
- **THEN** the system writes the new value to the faction file, refreshes `updatedAt`, and appends one JSONL line to the faction's history file containing the previous value and the timestamp of the change

### Requirement: Faction membership tracking

The system SHALL maintain a derived membership view that lists characters whose `factionId` points to a given faction. The view SHALL update whenever a character's `factionId` is changed.

#### Scenario: Membership reflects character changes

- **GIVEN** faction "天地會" with two members
- **WHEN** the user sets a third character's `factionId` to "天地會"
- **THEN** the faction's membership view immediately shows three members without requiring a page refresh

### Requirement: Faction summary feeds AI context

The system SHALL expose, on request from `ai-context`, a `FactionSummarySlice { factionId, name, alignment, currentSituation, keyMemberNames }` for each faction relevant to the current chapter, where relevance is determined by whether any character in `presentCharacters[]` belongs to the faction.

#### Scenario: Present faction summaries appear in context

- **GIVEN** chapter 3 with `presentCharacters[]` containing "韋小寶" (faction "天地會") and "鰲拜" (faction "鰲拜黨")
- **WHEN** `ai-context` requests faction slices for that chapter
- **THEN** the response contains exactly one slice per of the two factions, each carrying the latest `currentSituation`
