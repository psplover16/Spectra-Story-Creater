## ADDED Requirements

### Requirement: Chapter CRUD UI

The system SHALL provide a chapter management view in the active novel that lets the user list, create, read, update, and delete chapters, each persisted as defined by the `novel-data-model` capability.

#### Scenario: Create chapter

- **WHEN** the user creates a new chapter with title "誤入禁地" and outline "韋小寶在莊內走錯路"
- **THEN** the system writes the new chapter file with `index` set to the next available integer in the novel and the chapter appears at the end of the chapter list

#### Scenario: Delete chapter

- **WHEN** the user deletes chapter 3 and confirms
- **THEN** the system removes the chapter file together with its `chapters/<chapter-id>.branches/` directory and renumbers no other chapters

### Requirement: Outline required before content

The system SHALL allow the user to write or generate chapter `content` only when the chapter's `outline` field is a non-empty string. The "新增內容" or AI-assisted "寫這一段" UI SHALL be disabled until an outline is saved.

#### Scenario: Attempt to write content without outline

- **WHEN** the user opens a chapter whose `outline` is empty and tries to start writing content
- **THEN** the system disables the content editor and surfaces a prompt instructing the user to fill in the outline first

#### Scenario: Enable content editor after outline saved

- **WHEN** the user saves a non-empty outline for a chapter
- **THEN** the system enables the content editor without requiring a page reload

### Requirement: Scene configuration per chapter

The system SHALL allow each chapter to carry a `scene` object describing physical setting fields `location`, `time`, `weather`, `props[]`, `mood`, used as Layer 6 by `ai-context`.

#### Scenario: Save scene configuration

- **WHEN** the user saves `scene = { location: "禁地", time: "深夜", weather: "雪", props: ["油燈"], mood: "緊張" }`
- **THEN** the system persists the scene object and exposes it to `ai-context` on the next AI invocation

### Requirement: Chapter participant tracking

The system SHALL maintain `presentCharacters[]` of each chapter as a list of character ids that the user has marked as present in that chapter. The UI SHALL provide a multi-select picker scoped to the active novel's character list.

#### Scenario: Mark characters present

- **WHEN** the user marks "韋小寶" and "茅十八" as present in chapter 3
- **THEN** the chapter's `presentCharacters[]` contains exactly those two character ids and the change persists across application restart

### Requirement: Reorder chapters by index

The system SHALL allow the user to reorder chapters by drag-and-drop in the chapter list, updating the `index` field of every affected chapter to keep `index` a contiguous zero-based sequence.

#### Scenario: Move chapter 3 before chapter 2

- **WHEN** the user drags chapter 3 above chapter 2
- **THEN** the system rewrites both chapter files so that the previously-chapter-2 becomes index 2 and the previously-chapter-3 becomes index 1, and chapter 0 and earlier are unaffected
