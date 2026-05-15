## ADDED Requirements

### Requirement: Orchestrator novel identifier contract

The renderer SHALL pass a novel-folder reference to each tab orchestrator (CharactersTab, ChaptersTab, FactionsTab, WorldviewTab, SettingsTab) and to ChapterView, where the reference is the exact value the existing IPC handlers consume as their first string argument. The reference SHALL be derived from the workspace store's `workspaceRoot` joined with the active novel's folder name. The renderer SHALL NOT pass `Novel.id` (the randomly generated UUID stored inside the novel meta file) as the orchestrator prop, because `Novel.id` is not the value the IPC handlers consume and routing it through the IPC layer SHALL fail with file-not-found errors.

#### Scenario: Orchestrator receives a workspace-relative novel folder reference

- **GIVEN** the workspace store carries `workspaceRoot = "D:/Novels"` and `activeNovelName = "鹿鼎記"`
- **WHEN** the renderer mounts CharactersTab for the active novel
- **THEN** the prop value passed to CharactersTab SHALL be a string equivalent to the path `D:/Novels/鹿鼎記`, suitable for direct use as the first argument of `window.api.character.*` calls

#### Scenario: Renderer does not pass UUID as novel identifier

- **GIVEN** an active novel with `Novel.id = "32ee689d-b641-4f83-abea-6aea9feae143"` and `Novel.name = "鹿鼎記"` in workspace `D:/Novels`
- **WHEN** the renderer mounts any of CharactersTab, ChaptersTab, FactionsTab, WorldviewTab, SettingsTab, or ChapterView
- **THEN** the orchestrator prop SHALL NOT carry the UUID `32ee689d-b641-4f83-abea-6aea9feae143`; it SHALL carry the folder path derived from `workspaceRoot` and `Novel.name`

#### Scenario: IPC call argument matches orchestrator prop

- **GIVEN** an orchestrator receives `novelDir = "D:/Novels/鹿鼎記"` as its prop
- **WHEN** the orchestrator invokes any `window.api.<domain>.<method>` that takes a novel reference as its first argument
- **THEN** the first argument passed to the IPC call SHALL equal the prop value, character-for-character

### Requirement: IPC payload must be structured-cloneable

The renderer SHALL pass only structured-cloneable values to any `window.api.<domain>.<method>` invocation, because Electron's contextBridge serialises every argument across the renderer-to-preload boundary using V8 structured clone before the preload-side normalisation code runs. Vue 3 reactive references (returned by `ref`, `reactive`, `computed`, and any value spread from them while the subtree remains a Proxy) SHALL be flattened to plain JSON-serialisable data on the renderer side before the IPC call, so that the structured clone algorithm does not reject the call with `An object could not be cloned.`.

#### Scenario: Renderer writes a worldview entry sourced from a reactive Novel ref

- **GIVEN** WorldviewTab holds the active Novel inside a `ref<Novel | null>` and the user submits a new worldview entry
- **WHEN** the renderer invokes `window.api.novel.write(novelDir, payload)`
- **THEN** the `payload` argument SHALL be a plain JSON-serialisable object whose subtree contains no Vue reactive Proxy, so the contextBridge structured-clone step at the renderer-to-preload boundary SHALL succeed

#### Scenario: Renderer saves a character whose membership came from a reactive list

- **GIVEN** FactionsTab updates a character record by spreading the reactive character row pulled from `characters.value.find(...)`
- **WHEN** the renderer invokes `window.api.character.write(novelDir, updated)`
- **THEN** the `updated` argument SHALL be a plain JSON-serialisable object, and the structured-clone step SHALL NOT throw `An object could not be cloned.`

### Requirement: Settings page semantic grouping

The SettingsTab SHALL group its controls under two visible section labels, "全域設定" and "本小說設定", and SHALL display one short description sentence under each label naming which controls live in that group. The CLI executable path inputs and the AI binding panel SHALL be inside the "全域設定" group. The proactivity-level control for the active novel SHALL be inside the "本小說設定" group.

#### Scenario: Settings page renders both group labels

- **WHEN** the user opens SettingsTab for any active novel
- **THEN** the rendered DOM SHALL contain a visible heading or label with the text "全域設定" and a sibling heading or label with the text "本小說設定", and each heading SHALL be followed by a short description sentence

#### Scenario: CLI path controls are grouped under global settings

- **WHEN** the user opens SettingsTab
- **THEN** the Codex CLI path input, the Claude Code CLI path input, and the AI binding panel SHALL appear visually grouped under the "全域設定" heading

#### Scenario: Proactivity control is grouped under per-novel settings

- **WHEN** the user opens SettingsTab
- **THEN** the proactivity-level control for the active novel SHALL appear visually grouped under the "本小說設定" heading
