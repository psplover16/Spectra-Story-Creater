## ADDED Requirements

### Requirement: Workspace root selection

The system SHALL allow the user to select a workspace root directory at first launch, SHALL persist the selection in user settings, and SHALL allow the user to change it from a settings dialog at any time.

#### Scenario: First launch prompts for workspace

- **WHEN** the user launches the application for the first time with no persisted workspace
- **THEN** the system shows a directory picker and refuses to enter the main UI until a writable directory is chosen

#### Scenario: Reject read-only workspace root

- **WHEN** the user picks a directory that is read-only or for which the process lacks write permission
- **THEN** the system displays an error and re-shows the directory picker

### Requirement: List novels in workspace

The system SHALL list all immediate subdirectories of the workspace root that contain a `novel.json` file as available novels, ignoring directories without `novel.json`.

#### Scenario: Mixed directory contents

- **WHEN** the workspace root contains `鹿鼎記/`, `笑傲江湖/`, `_scratch/`, where only the first two contain `novel.json`
- **THEN** the system lists exactly "鹿鼎記" and "笑傲江湖" as available novels

### Requirement: Single active novel constraint

The system SHALL hold at most one active novel at a time. Activating a different novel SHALL close the currently active novel after confirmation by the user, releasing any in-memory state tied to the previous novel.

#### Scenario: Switch novels with unsaved chapter tabs

- **WHEN** the user selects a different novel while chapter tabs of the active novel have unsaved edits
- **THEN** the system prompts the user to save or discard unsaved edits, and proceeds with the switch only after the prompt is resolved

#### Scenario: Memory state is released on switch

- **WHEN** the user switches from novel A to novel B
- **THEN** the system clears workspace-level caches for novel A and reinitializes them for novel B before exposing the new state to the UI

### Requirement: Chapter tab management (one chapter per tab, one tab per chapter)

The system SHALL allow multiple chapter tabs to be open in the active novel, SHALL enforce that the same chapter cannot be opened in two main tabs simultaneously, and SHALL surface an error or focus the existing tab when a duplicate open is attempted.

#### Scenario: Open a second chapter tab

- **WHEN** the user opens chapter 3 while chapter 1 is already open
- **THEN** the system displays both tabs side by side and focuses the newly opened chapter 3

#### Scenario: Attempt to open a chapter already opened

- **WHEN** the user attempts to open chapter 3 while chapter 3 is already open in another tab
- **THEN** the system focuses the existing tab instead of creating a duplicate

### Requirement: Save-as-branch functionality

The system SHALL allow the user to save the current chapter as a named branch, creating an independent copy under `<novel>/chapters/<chapter-id>.branches/<branch-id>.json`. Branches SHALL NOT synchronize with the main chapter content or with each other.

#### Scenario: Save a branch

- **WHEN** the user clicks "另存為分支" on chapter 3 and provides the name "alt-pov-茅十八"
- **THEN** the system creates a branch file containing a snapshot of the current chapter content, and the main chapter file remains unchanged

#### Scenario: Branch list view

- **WHEN** the user opens the branch list of chapter 3
- **THEN** the system shows all existing branches with name, created timestamp, and the option to open each branch in a read-only viewer for comparison
