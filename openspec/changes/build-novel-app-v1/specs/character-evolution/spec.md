## ADDED Requirements

### Requirement: Detect personality drift after each AI invocation

The system SHALL run a `PersonalityDriftDetector` against the just-accepted AI response and the active character profiles, identifying behavioral deltas that diverge from the recorded `personality` text or from `relationships[]`.

#### Scenario: Detect a new behavioral pattern

- **GIVEN** character "韋小寶" with personality "市井狡黠、自私自利"
- **WHEN** an accepted response shows 韋小寶 sacrificing his own life to protect another character without external coercion
- **THEN** the detector emits a `DriftFinding { characterId, field: 'personality', evidence, suggestedRewrite }`

### Requirement: Suggest personality update without writing

When a drift finding is produced, the system SHALL display a non-blocking notification in the suggestion panel showing the evidence and the suggested rewrite of the personality field. The system SHALL NOT modify any character file automatically.

#### Scenario: Notification without auto-write

- **WHEN** a drift finding is surfaced for "韋小寶" with suggested rewrite "市井狡黠、自私，但對義氣之交願捨命相護"
- **THEN** the suggestion panel shows the suggestion and the character file on disk remains unchanged

### Requirement: User chooses whether to accept the suggested rewrite

The system SHALL present three actions per drift suggestion: `accept-as-suggested` (apply the suggested rewrite), `edit-then-accept` (open the character editor pre-filled with the suggested text), `dismiss` (record the dismissal and do not change the profile).

#### Scenario: Accept suggested rewrite

- **WHEN** the user clicks `accept-as-suggested` on a drift suggestion for "韋小寶"
- **THEN** the system rewrites `韋小寶.json` `personality` field to the suggested text and refreshes the character editor view

#### Scenario: Edit before accepting

- **WHEN** the user clicks `edit-then-accept`
- **THEN** the system opens the character editor focused on the `personality` field pre-filled with the suggestion text, and awaits the user's manual save

#### Scenario: Dismiss without changes

- **WHEN** the user clicks `dismiss`
- **THEN** the system records a `DriftDismissal { characterId, findingId, timestamp }` entry and the character file is unchanged

### Requirement: Drift history retained for later review

The system SHALL retain every drift finding (accepted, edited, or dismissed) under `<novel>/characters/<character-id>.drift-log.jsonl`, one record per line in JSON Lines format.

#### Scenario: Drift log append-only

- **WHEN** a drift finding is generated for "韋小寶"
- **THEN** the system appends one JSON line to `<novel>/characters/<character-id>.drift-log.jsonl` containing the finding metadata, the action taken (or `pending`), and the timestamp
