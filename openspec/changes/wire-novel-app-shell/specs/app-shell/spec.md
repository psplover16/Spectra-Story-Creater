## ADDED Requirements

### Requirement: Tab panels populated by orchestrators

The renderer SHALL render an orchestrator component inside each tab panel of `NovelView` (characters, chapters, factions, worldview, settings). No tab panel SHALL render an empty slot when an active novel is selected.

#### Scenario: User opens a tab in an active novel

- **WHEN** the user selects a novel and switches to any of the five tabs (characters, chapters, factions, worldview, settings)
- **THEN** the corresponding orchestrator component (`CharactersTab`, `ChaptersTab`, `FactionsTab`, `WorldviewTab`, `SettingsTab`) SHALL be mounted in that tab panel and SHALL display its initial state (list of items or editor) without the user performing additional actions

#### Scenario: User switches between tabs

- **WHEN** the user switches from one tab to another within the same novel
- **THEN** the previous orchestrator SHALL unmount or be hidden and the next orchestrator SHALL mount or become visible
- **AND** any unsaved edits in the previous orchestrator SHALL be preserved according to the orchestrator's own draft policy

### Requirement: Startup gate via CollaborationMode selection

The renderer SHALL present a CollaborationMode selection view (`CollaborationModeGate`) before any workspace or novel UI is shown when the application starts.

#### Scenario: Fresh application start with no persisted mode

- **WHEN** the user launches the application and no CollaborationMode has been persisted
- **THEN** the renderer SHALL display `CollaborationModeGate` as the first interactive view
- **AND** the workspace selection view SHALL NOT be reachable until the user has chosen a mode (collaborator, ghost-writer, or auto)

#### Scenario: Application start with previously chosen mode

- **WHEN** the user launches the application and a CollaborationMode was persisted in user-level config
- **THEN** the renderer SHALL skip `CollaborationModeGate` and route directly to workspace restoration
- **AND** the chosen mode SHALL be available to downstream views via the store

### Requirement: Workspace state persistence across restarts

The renderer SHALL persist the active workspace path and the active novel identifier to a user-level configuration file, and SHALL restore them on the next application launch.

#### Scenario: User selects a workspace and a novel, then restarts

- **WHEN** the user has selected a workspace path and opened a novel in the current session, then closes and re-launches the application
- **THEN** the renderer SHALL read the persisted state and SHALL re-enter the previously active novel without prompting the user to pick the workspace again

##### Example: persisted state shape

- **GIVEN** the persistence layer stores `{ workspacePath: "D:\Novels", activeNovelId: "nightfog-city" }`
- **WHEN** the application launches
- **THEN** the renderer SHALL call the workspace `detectActive` IPC channel and SHALL hydrate the workspace store with both fields

#### Scenario: Persistence file missing or unreadable

- **WHEN** the application launches and the persistence file does not exist or fails schema validation
- **THEN** the renderer SHALL start with an empty workspace state and SHALL NOT crash
- **AND** the renderer SHALL route the user to `WorkspaceSelectView` after `CollaborationModeGate`

### Requirement: AI adapter bootstrap before suggestion entry points

The renderer SHALL construct concrete adapter instances for the supported AI response sources (Codex CLI and Claude Code) during application startup, and SHALL inject them into the suggestion-request composable before any suggestion-triggering UI becomes interactive.

#### Scenario: User clicks "Get suggestion" in ChapterView

- **WHEN** the user opens a chapter in `ChapterView` and clicks the "Get suggestion" button
- **THEN** the suggestion-request composable SHALL receive a pre-constructed adapter for the resolved AI response source (per the 4-layer binding rules already defined in the `ai-switching` capability)
- **AND** the renderer SHALL NOT need to lazily build the adapter inside the click handler

#### Scenario: Neither CLI is available at startup

- **WHEN** neither Codex CLI nor Claude Code is detected on the host at startup
- **THEN** the bootstrap layer SHALL still complete without throwing
- **AND** suggestion entry points SHALL surface the CLI-unavailable dialog (defined in `ai-adapters` capability) when invoked, rather than failing silently

### Requirement: Chapter editor entry from chapter list

The renderer SHALL provide a user-observable entry point inside `ChaptersTab` that opens `ChapterView` for a selected chapter.

#### Scenario: User clicks a chapter row in ChaptersTab

- **WHEN** the user clicks a chapter row inside `ChaptersTab`
- **THEN** the renderer SHALL open `ChapterView` for that chapter
- **AND** if the chapter is already open, the renderer SHALL focus the existing tab rather than open a duplicate (consistent with the chapter-tab uniqueness rule in `workspace-management`)

### Requirement: Suggestion and export entry points in ChapterView

The renderer SHALL expose user-triggerable entry points inside `ChapterView` for requesting an AI suggestion and for exporting the chapter as HTML.

#### Scenario: User triggers suggestion from ChapterView

- **WHEN** the user is editing a chapter in `ChapterView` and activates the suggestion entry point
- **THEN** the renderer SHALL mount or reveal `SuggestionPanel` and SHALL call the suggestion-request composable
- **AND** the resulting suggestion SHALL pass through the consistency audit dry-run path already defined in `consistency-audit` before being shown

#### Scenario: User triggers export from ChapterView

- **WHEN** the user activates the export entry point in `ChapterView`
- **THEN** the renderer SHALL mount or reveal `ExportDialog`
- **AND** the resulting HTML SHALL be written through the export IPC channel already defined in `chapter-export`

### Requirement: Wiring layer adds no new IPC channels or schema changes

The wiring layer SHALL use only existing IPC channels, preload `contextBridge` surfaces, and capability behaviors defined in the eleven capabilities introduced by the prior change. The wiring layer SHALL NOT add new IPC channels, modify existing channel payload shapes, or change preload surfaces.

#### Scenario: Renderer needs novel data

- **WHEN** an orchestrator needs novel, character, chapter, or faction data
- **THEN** it SHALL invoke the existing `window.api.*` channels defined by the prior change
- **AND** it SHALL NOT define new channels or wrap existing channels with renamed surfaces

##### Example: forbidden vs. allowed surfaces

| Action                                                                | Allowed | Notes                                                                                          |
| --------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `window.api.character.list(novelId)`                                  | yes     | existing channel from prior change                                                             |
| `window.api.character.bulkImport(payload)`                            | no      | would introduce a new channel; out of scope for this capability                                |
| renderer-side cache of `character.list` results                       | yes     | orchestrator-local state; does not change IPC contract                                         |
| `window.api.appShell.bootstrap()`                                     | no      | bootstrap runs in renderer; no new main-process channel needed                                 |
