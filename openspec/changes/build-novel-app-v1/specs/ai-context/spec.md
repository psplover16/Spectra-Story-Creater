## ADDED Requirements

### Requirement: Six-layer context structure

The system SHALL define an `AssembledContext` value containing six layers in this fixed order: `worldview`, `characters`, `overallPlot`, `presentCharacters`, `chapterOutline`, `chapterScene`. Each layer SHALL be expressible as zero or more "slices" derived from novel data files.

#### Scenario: Empty layers serialize cleanly

- **WHEN** a chapter has no scene configured and no characters marked present
- **THEN** the assembled context still contains all six layer keys with `presentCharacters = []` and `chapterScene` set to an empty scene object

### Requirement: Smart selection by relevance score

The `ContextAssembler` SHALL assign each candidate slice a relevance score in the range [0, 1] using deterministic rules driven by chapter index, present characters, faction associations, and outline keyword overlap. The assembler SHALL include only slices whose score meets or exceeds a configurable threshold (default 0.3).

#### Scenario: Worldview slice included by keyword overlap

- **GIVEN** a worldview slice tagged with keyword "禁地" and a chapter outline containing the word "禁地"
- **WHEN** the assembler runs for that chapter
- **THEN** the worldview slice is included in the `worldview` layer of the result

#### Scenario: Off-topic character slice excluded

- **GIVEN** a character whose `factionId` is unrelated to all characters in `presentCharacters` and whose name does not appear in the chapter outline
- **WHEN** the assembler runs for that chapter
- **THEN** the character slice is not included in the `characters` layer

### Requirement: Token budget enforcement

The `ContextAssembler` SHALL enforce a per-invocation token budget (default 8000) by including slices in descending order of relevance score until either no candidate remains above threshold or the cumulative token count of included slices would exceed the budget. Slices that would exceed the budget SHALL be omitted, never truncated mid-slice.

#### Scenario: Budget cuts off lower-scored slices

- **GIVEN** slices ranked S1=0.9, S2=0.8, S3=0.6 with token costs 4000, 3000, 3000 and budget 8000
- **WHEN** the assembler runs
- **THEN** the result contains S1 and S2 but not S3, and the cumulative token count is 7000

#### Scenario: Single oversized slice omitted

- **GIVEN** a single slice S1 with relevance 0.95 and token cost 12000 with budget 8000
- **WHEN** the assembler runs
- **THEN** S1 is omitted, the corresponding layer is left empty, and a warning is recorded in `assemblerDiagnostics.skipped[]`

### Requirement: Deterministic ordering within layers

The system SHALL order slices within each layer first by descending relevance score, then by the slice's stable `id` ascending to break ties, producing reproducible output for identical inputs.

#### Scenario: Reproducible output

- **WHEN** the assembler is invoked twice with identical inputs (same novel state, same chapter id)
- **THEN** the two `AssembledContext` results are deep-equal, including the ordering of items inside every layer
