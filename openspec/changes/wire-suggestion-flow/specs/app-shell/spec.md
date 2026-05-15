## ADDED Requirements

### Requirement: Suggestion request event flow is wired end to end

When the user clicks the "Give Me Suggestions" button inside the chapter view's SuggestionPanel, the renderer SHALL invoke the configured AI subprocess, run the consistency auditor dry-run on the response, and propagate the resulting suggestion (or warning, or fallback dialog) back to SuggestionPanel without requiring any further manual action. The App shell SHALL own a single suggestion-flow controller (via the `useSuggestionFlow` composable) that wires the AiResolver, ContextAssembler, auditor, adapters, and CLI fallback prompt together; the previous behavior, in which the App-level handler is an empty function and the SuggestionPanel button has no effect, SHALL NOT remain.

#### Scenario: clicking the suggestion button triggers the full pipeline

- **WHEN** the user is viewing a chapter and clicks the "Give Me Suggestions" button inside SuggestionPanel
- **THEN** the renderer SHALL call ContextAssembler to build the six-slice context for the active chapter, invoke the AI adapter resolved by AiResolver for role `plot-driver`, run `auditorDryRun` on the response, and surface the result in SuggestionPanel before user interaction is required again

#### Scenario: button does not silently no-op

- **WHEN** the user clicks the "Give Me Suggestions" button
- **THEN** at least one of the following SHALL occur within the same user interaction: SuggestionPanel displays new suggestion content, SuggestionPanel displays an inline warning, the CliFallbackDialog opens, or SuggestionPanel displays an inline error explaining why the request could not proceed; SuggestionPanel SHALL NOT remain in its previous state with no feedback

### Requirement: Suggestion role defaults to plot-driver and respects user bindings

The suggestion-flow controller SHALL pass `role = "plot-driver"` as the default `ResolveQuery.role` to AiResolver. When the user has configured a role binding for `plot-driver` in the AiBindingPanel, AiResolver SHALL honor that binding and dispatch the AI call to the bound CLI source; when no role binding is set, AiResolver SHALL fall through to character, paragraph, and finally global default per its existing four-layer fallback contract.

#### Scenario: plot-driver role binding is honored

- **GIVEN** the user has bound role `plot-driver` to `claude` in AiBindingPanel and the global default is `codex`
- **WHEN** the user clicks "Give Me Suggestions" in any chapter
- **THEN** the AI request SHALL be dispatched to the Claude Code adapter and SuggestionPanel SHALL display a source badge indicating the role-binding hit layer

#### Scenario: no role binding falls through to global default

- **GIVEN** the user has not configured any role binding and the global default is `codex`
- **WHEN** the user clicks "Give Me Suggestions"
- **THEN** the AI request SHALL be dispatched to the Codex CLI adapter and SuggestionPanel SHALL display a source badge indicating the global hit layer

### Requirement: Suggestion loading state is owned by the App shell and gates the button

The App shell SHALL own a single `isLoading` reactive value that becomes `true` from the moment a suggestion request begins until the request resolves (with `ok`, `findings`, `inconclusive`, or `cancelled`). The "Give Me Suggestions" button inside SuggestionPanel SHALL be disabled while `isLoading` is `true`. While the CliFallbackDialog is open awaiting the user's retry/switch/cancel decision, `isLoading` SHALL remain `true` so that a second suggestion request cannot be initiated in parallel.

#### Scenario: button is disabled during an in-flight request

- **WHEN** the user has clicked "Give Me Suggestions" and the AI adapter call has not yet resolved
- **THEN** the "Give Me Suggestions" button SHALL have its disabled attribute set, and any additional clicks SHALL be ignored

#### Scenario: button is re-enabled regardless of outcome

- **WHEN** the suggestion request resolves with status `ok`, `findings`, `inconclusive`, or `cancelled`
- **THEN** the App shell SHALL set `isLoading` to `false` and the "Give Me Suggestions" button SHALL become enabled again

### Requirement: Findings and inconclusive results render as inline warnings, not dialogs

When `useSuggestionRequest.invoke` returns `status = "findings"` or `status = "inconclusive"`, SuggestionPanel SHALL display the AI-generated suggestion text along with a red inline warning block. The warning block SHALL include a heading "本建議與既有設定不一致" and a list of the detector findings (detector type plus description for each). For `inconclusive` results, SuggestionPanel SHALL additionally render a clarifying sentence indicating that some detectors could not reach a conclusion and that the user MUST review the suggestion carefully before adopting it. SuggestionPanel SHALL NOT open a modal dialog for findings; the user MUST be able to continue using other UI controls (re-clicking the suggestion button, saving the chapter, switching tabs) without dismissing a modal.

#### Scenario: findings produce inline warning with suggestion text

- **WHEN** the suggestion request resolves with status `findings` containing one or more detector hits
- **THEN** SuggestionPanel SHALL render the AI-generated text together with a red inline block titled "本建議與既有設定不一致" listing each finding, and SHALL NOT open any modal dialog

#### Scenario: inconclusive results add a careful-review note

- **WHEN** the suggestion request resolves with status `inconclusive`
- **THEN** SuggestionPanel SHALL render the AI-generated text, the inline findings warning, and an additional sentence advising careful review because some detectors could not reach a conclusion

### Requirement: CLI fallback dialog handles unavailable CLI sources

When `useSuggestionRequest`'s internal CLI fallback flow signals that the currently selected CLI source is unavailable, the App shell SHALL surface the existing CliFallbackDialog component, populated with the failed source name and the three options retry, switch, and cancel. After the user picks an option, the App shell SHALL resolve the pending fallback promise with the user's decision so that `useSuggestionRequest` can continue or terminate its retry loop accordingly. The App shell SHALL NOT auto-fallback between CLI sources without showing the dialog.

#### Scenario: retry routes back to the same source

- **GIVEN** the suggestion request's first attempt failed with a CLI unavailable or CLI execution error from the Codex CLI
- **WHEN** the user clicks "Retry" in CliFallbackDialog
- **THEN** the dialog SHALL close, `useSuggestionRequest` SHALL retry the request against the Codex CLI adapter, and `isLoading` SHALL remain `true` until the retry resolves

#### Scenario: switch routes to the other source

- **GIVEN** the suggestion request's first attempt failed with a CLI unavailable error from the Codex CLI
- **WHEN** the user clicks "Switch" in CliFallbackDialog
- **THEN** the dialog SHALL close, `useSuggestionRequest` SHALL retry the request against the Claude Code adapter, and `isLoading` SHALL remain `true` until the retry resolves

#### Scenario: cancel collapses SuggestionPanel cleanly

- **GIVEN** the suggestion request's CLI source has failed and the CliFallbackDialog is open
- **WHEN** the user clicks "Cancel" in CliFallbackDialog
- **THEN** the dialog SHALL close, `useSuggestionRequest` SHALL return `status = "cancelled"`, the App shell SHALL set `isLoading` to `false` and SHALL leave `currentSuggestion` unchanged, and no error banner SHALL be shown

### Requirement: Suggestion flow does not introduce new IPC channels or schema changes

The suggestion-flow wiring SHALL reuse the existing IPC surface (`ai:invoke`, `novel:read`, `character:list`, `chapter:list`) and SHALL NOT introduce new IPC channels, modify novel/character/chapter/faction/worldview file schemas, or change any existing adapter or resolver public interfaces. All wiring changes SHALL be confined to the renderer-side App shell, the new `useSuggestionFlow` composable, the SuggestionPanel component (additive props), and the ChapterView component (additive props).

#### Scenario: no new IPC channel is registered

- **WHEN** the suggestion-flow wiring is applied
- **THEN** the set of channels registered with `ipcMain.handle` SHALL be unchanged compared to before this change, and the renderer SHALL invoke only channels that already existed prior to this change

#### Scenario: no schema field changes

- **WHEN** the suggestion-flow wiring is applied
- **THEN** the JSON shapes of novel, character, chapter, faction, and worldview files on disk SHALL be unchanged compared to before this change
