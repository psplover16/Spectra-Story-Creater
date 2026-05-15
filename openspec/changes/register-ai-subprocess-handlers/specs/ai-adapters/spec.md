## ADDED Requirements

### Requirement: Main process spawns AI CLI subprocesses through the cliInvoker module

The Electron main process SHALL provide a `cliInvoker.invokeCli(source, input, deps)` function that spawns the selected AI CLI (Codex CLI or Claude Code) as a Node child process, writes the prompt to the child's stdin, waits for the child to close, and returns an `AiInvokeResult` carrying the trimmed stdout text and the source. The spawn environment SHALL be derived from `buildSpawnEnv()` so that UTF-8 encoding (`PYTHONIOENCODING`, `LANG`, `LC_ALL`, `SPECTRA_CHCP=65001`) is applied to the child process. The function SHALL distinguish three failure modes by throwing the corresponding error class from `src/services/ai/errors.ts`:

- `CliUnavailableError(source)` when the CLI path cannot be resolved
- `CliExecutionError(source, exitCode, stderr)` when the child exits with a non-zero exit code, with `stderr` truncated to its first 200 characters
- `CliTimeoutError(source, timeoutMs)` when the child does not close within `timeoutMs` (default 30000, overridable via the `SPECTRA_AI_TIMEOUT_MS` environment variable)

#### Scenario: Successful CLI invocation returns trimmed stdout

- **GIVEN** the CLI for `source = "codex"` is available at a known path and its mocked stdout is the string "AI response\n"
- **WHEN** `invokeCli("codex", { context, prompt: "hello", role: "plot-driver" }, deps)` is called
- **THEN** the function SHALL resolve to an `AiInvokeResult` whose `text === "AI response"`, `source === "codex"`, and `durationMs` is a non-negative number

#### Scenario: Missing CLI path raises CliUnavailableError

- **GIVEN** `deps.getCliPath("claude")` resolves to `null`
- **WHEN** `invokeCli("claude", ..., deps)` is called
- **THEN** the returned promise SHALL reject with an error whose `instanceof CliUnavailableError === true` and whose `source === "claude"`

#### Scenario: Non-zero exit code raises CliExecutionError carrying stderr

- **GIVEN** the spawned child writes "boom" to stderr and exits with code 1
- **WHEN** `invokeCli` waits for the child to close
- **THEN** the returned promise SHALL reject with an error whose `instanceof CliExecutionError === true`, whose `exitCode === 1`, and whose `stderr` field contains the literal text "boom"

#### Scenario: Timeout kills the child and raises CliTimeoutError

- **GIVEN** `timeoutMs = 100` and the spawned child never closes within that window
- **WHEN** the 100ms timer elapses
- **THEN** `child.kill('SIGTERM')` SHALL be invoked on the child handle, and the returned promise SHALL reject with an error whose `instanceof CliTimeoutError === true` and whose `timeoutMs === 100`

#### Scenario: SPECTRA_AI_TIMEOUT_MS environment variable overrides the default

- **GIVEN** the environment variable `SPECTRA_AI_TIMEOUT_MS = "5000"` is set
- **WHEN** `invokeCli` is called without an explicit `timeoutMs` in deps
- **THEN** the effective timeout SHALL be 5000ms rather than the default 30000ms

### Requirement: Main process registers the ai:invoke and consistency:dryRun IPC channels at startup

The Electron main process's `registerAllHandlers` function SHALL call `registerAiHandlers(ipcMain, deps)` during app initialization, with `deps.invoke = (source, input) => invokeCli(source, input, ...)` so that incoming `ai:invoke` IPC calls are routed to the CLI subprocess. The `consistency:dryRun` IPC channel SHALL likewise be registered through the same handler.

#### Scenario: ai:invoke channel is registered on startup

- **WHEN** `registerAllHandlers` runs during app startup
- **THEN** the set of channels passed to `ipcMain.handle` SHALL include the string literal `"ai:invoke"`

#### Scenario: Renderer ai.invoke call no longer fails with "no handler registered"

- **GIVEN** the main process has completed startup
- **WHEN** the renderer invokes `window.api.ai.invoke(source, input)`
- **THEN** the promise SHALL be handled by `registerAiHandlers`'s registered listener, and SHALL NOT reject with the message "No handler registered for 'ai:invoke'"

### Requirement: ai.invoke preload bridge accepts a source parameter

The preload bridge `window.api.ai.invoke` SHALL accept two parameters `(source: AiSource, input: AiInvokeInput)` and forward both through `ipcRenderer.invoke('ai:invoke', source, plain(input))`. The renderer-side `createRendererAdapter(source)` factory SHALL invoke this bridge with both arguments so that the main process handler can dispatch to the correct CLI without re-deriving the source from input metadata.

#### Scenario: Preload forwards source and input separately

- **GIVEN** a renderer calls `window.api.ai.invoke("codex", { context, prompt: "x", role: "plot-driver" })`
- **WHEN** the call reaches the preload bridge
- **THEN** `ipcRenderer.invoke` SHALL be called with the channel `"ai:invoke"` and the two trailing arguments `"codex"` and a structured-clone-safe copy of the input object

#### Scenario: Renderer adapter passes its own source to the bridge

- **GIVEN** `createRendererAdapter("claude")` constructs an `AiAdapter` whose `source === "claude"`
- **WHEN** the adapter's `invoke(input)` method is called
- **THEN** the adapter SHALL internally call `window.api.ai.invoke("claude", input)`, and the resolved `AiInvokeResult.source` SHALL equal `"claude"`

### Requirement: CLI path resolution falls through cli.json then cliDetector

The main-process helper `resolveCliPath(source)` SHALL first read the persisted CLI settings file (`<userData>/cli.json` via the existing `cliSettingsRepository`) and, if it contains a non-empty path for the requested source and that path passes `fs.access`, return it. Otherwise, the helper SHALL invoke `cliDetector.detectCli(source)` to scan the runtime environment. If detection also returns null, the helper SHALL return null and let `invokeCli` raise `CliUnavailableError`.

#### Scenario: Valid persisted path is used directly

- **GIVEN** `cli.json` contains `{ codex: "/usr/local/bin/codex", ... }` and `fs.access("/usr/local/bin/codex")` succeeds
- **WHEN** `resolveCliPath("codex")` is invoked
- **THEN** it SHALL return `"/usr/local/bin/codex"` and SHALL NOT call `cliDetector.detectCli`

#### Scenario: Stale persisted path triggers redetection

- **GIVEN** `cli.json` contains `{ codex: "/old/path/codex" }` but `fs.access("/old/path/codex")` fails with ENOENT, and `cliDetector.detectCli("codex")` returns `"/new/path/codex"`
- **WHEN** `resolveCliPath("codex")` is invoked
- **THEN** it SHALL return `"/new/path/codex"`

#### Scenario: Both lookups failing returns null

- **GIVEN** `cli.json` has no codex entry and `cliDetector.detectCli("codex")` returns null
- **WHEN** `resolveCliPath("codex")` is invoked
- **THEN** it SHALL return `null`, and any subsequent `invokeCli("codex", ...)` call SHALL reject with `CliUnavailableError`
