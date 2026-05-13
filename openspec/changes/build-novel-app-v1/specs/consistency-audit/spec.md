## ADDED Requirements

### Requirement: Dry-run before AI response is shown

The system SHALL invoke a `ConsistencyAuditor` dry-run on every AI response candidate before the response is shown to the user. The auditor SHALL receive the candidate text, the assembled context, and the active novel state, and SHALL return zero or more `AuditFinding` entries.

#### Scenario: Clean response passes through

- **WHEN** the auditor returns an empty findings array for an AI response candidate
- **THEN** the system shows the response to the user without any dialog

### Requirement: Five consistency categories detected

The auditor SHALL classify each finding into exactly one of five categories: `ooc` (out-of-character behavior), `unexplained-ability` (character uses an ability not in their profile), `relationship-conflict` (relationship state contradicts established setup), `worldview-conflict` (event contradicts established worldview rules), `timeline-conflict` (dead characters reappearing, chronology violations).

#### Scenario: OOC detection

- **GIVEN** a character profile with `personality = "膽小怕事"` and no prior triggering event
- **WHEN** the candidate response shows that character "毅然衝向魔王"
- **THEN** the auditor emits a finding with `category = 'ooc'` and a `description` referencing the personality field

#### Scenario: Unexplained ability detection

- **GIVEN** a character whose `abilities[]` does not include magic
- **WHEN** the candidate response shows that character "施展火球術"
- **THEN** the auditor emits a finding with `category = 'unexplained-ability'`

#### Scenario: Timeline conflict detection

- **GIVEN** a character whose death is recorded in chapter 5
- **WHEN** the candidate response for chapter 7 has that character speaking with no resurrection event
- **THEN** the auditor emits a finding with `category = 'timeline-conflict'`

### Requirement: User negotiation dialog with three actions

When findings are non-empty, the system SHALL show a `ConflictDialog` listing every finding and offer the user exactly three actions: `rewrite` (ask the AI to rewrite this response), `update-setup` (open the relevant character or worldview editor to adjust the setup), `ignore` (accept the response as-is with a recorded rationale).

#### Scenario: User chooses to rewrite

- **WHEN** the user clicks `rewrite` in the conflict dialog
- **THEN** the system discards the candidate text, re-invokes the same AI request with an additional instruction summarizing the findings, and re-runs the auditor on the new response

#### Scenario: User chooses to update setup

- **WHEN** the user clicks `update-setup` on an OOC finding referencing character "韋小寶"
- **THEN** the system opens the character editor focused on "韋小寶"'s `personality` field and pauses the response until the editor is closed

#### Scenario: User chooses to ignore

- **WHEN** the user clicks `ignore`
- **THEN** the system shows the candidate response, persists an `AuditIgnoreRecord { findings, timestamp, userNote? }` for later review, and does not modify the novel state

### Requirement: Never auto-modify novel state

The auditor and its UI SHALL NOT mutate any character, chapter, faction, or worldview file. All edits SHALL flow through the user via the standard editors.

#### Scenario: Ignored finding leaves data untouched

- **GIVEN** an OOC finding the user chose to ignore
- **WHEN** the user reopens the character profile referenced in the finding
- **THEN** the profile is identical to its state before the AI request was issued

### Requirement: Inconclusive findings do not block

The auditor SHALL classify a finding as `inconclusive` when it cannot decide between conflict and non-conflict (for example, when relevant context slices were dropped by `ai-context` budgeting). Inconclusive findings SHALL be surfaced as warnings in the suggestion panel but SHALL NOT trigger the conflict dialog.

#### Scenario: Inconclusive warning only

- **WHEN** the auditor returns one inconclusive finding and no other findings
- **THEN** the response is shown to the user and the suggestion panel displays a yellow warning summarizing the inconclusive finding

### Requirement: Mute consistency category for a chapter range

The system SHALL allow the user to temporarily mute a consistency category for the active chapter or for the next N chapters (1, 3, or 5). Muted categories SHALL NOT trigger the conflict dialog during the mute window but SHALL still be recorded in `AuditIgnoreRecord` entries for later review.

#### Scenario: Mute OOC for the next 3 chapters

- **WHEN** the user mutes `ooc` for the next 3 chapters and OOC findings arise in chapters 4, 5, 6
- **THEN** the conflict dialog does not appear for those findings, and chapter 7 onwards once again triggers the dialog for OOC findings
