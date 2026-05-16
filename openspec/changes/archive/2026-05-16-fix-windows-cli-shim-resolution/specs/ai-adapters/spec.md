## ADDED Requirements

### Requirement: PATH lookup on Windows SHALL select an executable extension when multiple candidates exist

When the main process resolves an AI CLI executable through the system PATH on Windows, the resolver SHALL parse every line returned by `where <name>`, normalize whitespace and blank lines, and SHALL select the first candidate whose path ends with one of the executable extensions in the priority order `.cmd > .exe > .bat` (case-insensitive). The resolver SHALL ignore candidates that do not end with any of these extensions, including the unsuffixed Unix shim that npm and similar tools install alongside the `.cmd` shim. When no candidate matches any executable extension, the resolver SHALL return `null` so that the well-known fallback list takes over. On non-Windows platforms, the existing single-line behavior SHALL be preserved.

#### Scenario: Windows where output mixes Unix shim and cmd shim

- **GIVEN** the operating system is Windows and `where codex` returns the two lines `C:\nvm4w\nodejs\codex` and `C:\nvm4w\nodejs\codex.cmd`
- **WHEN** the resolver consumes the `where` output
- **THEN** the resolver SHALL return `C:\nvm4w\nodejs\codex.cmd` and SHALL NOT return `C:\nvm4w\nodejs\codex`

#### Scenario: Windows where output prefers cmd over exe

- **GIVEN** the operating system is Windows and `where codex` returns the two lines `C:\path\codex.exe` and `C:\path\codex.cmd` in that order
- **WHEN** the resolver consumes the `where` output
- **THEN** the resolver SHALL return `C:\path\codex.cmd` because the `.cmd > .exe` priority overrides the order returned by `where`

##### Example: extension priority table

| where output (in order) | Resolver return value | Notes |
| ----------------------- | --------------------- | ----- |
| `["C:\\a\\codex", "C:\\a\\codex.cmd"]` | `C:\\a\\codex.cmd` | Unix shim ignored |
| `["C:\\a\\codex.exe", "C:\\a\\codex.cmd"]` | `C:\\a\\codex.cmd` | `.cmd` outranks `.exe` |
| `["C:\\a\\codex.cmd", "C:\\a\\codex.exe"]` | `C:\\a\\codex.cmd` | `.cmd` first either way |
| `["C:\\a\\codex.exe", "C:\\a\\codex.bat"]` | `C:\\a\\codex.exe` | `.exe` outranks `.bat` |
| `["C:\\a\\codex"]` | `null` | No executable extension; falls through to well-known fallbacks |
| `["C:\\a\\codex.bat"]` | `C:\\a\\codex.bat` | Lowest-priority extension still selected when alone |

#### Scenario: Windows where output has no executable extensions falls through

- **GIVEN** the operating system is Windows and `where codex` returns one line `C:\nvm4w\nodejs\codex` and no other candidates
- **WHEN** the resolver consumes the `where` output
- **THEN** the resolver SHALL return `null`, and the surrounding `detectCli` SHALL proceed to the well-known fallback list rather than returning the unsuffixed shim

#### Scenario: POSIX path lookup is unaffected

- **GIVEN** the operating system is Linux or macOS and `which codex` returns one line `/usr/local/bin/codex`
- **WHEN** the resolver consumes the `which` output
- **THEN** the resolver SHALL return `/usr/local/bin/codex` exactly as today, with no extension filtering applied

### Requirement: Windows MUST invoke .cmd and .bat shims through cmd.exe

When `cliInvoker.invokeCli` starts a child process on Windows and the resolved CLI path ends with `.cmd` or `.bat` (case-insensitive), the invoker MUST spawn `cmd.exe` with the argument list `['/d', '/s', '/c', <cliPath>]` instead of spawning `<cliPath>` directly. The original `cliPath` MUST be passed as a single argument so that Node's child_process layer applies its standard Windows argument quoting; the invoker MUST NOT manually concatenate or quote the path. For all other cases — `.exe` paths on Windows and any path on non-Windows platforms — the invoker MUST continue to spawn `<cliPath>` directly with an empty argument list, preserving the existing behavior. The stdin write, stdout read, stderr capture, exit-code handling, timeout, and the three error classes (`CliUnavailableError`, `CliExecutionError`, `CliTimeoutError`) MUST remain semantically equivalent to the existing contract regardless of whether the cmd.exe wrapper is used.

#### Scenario: Windows .cmd path is wrapped with cmd.exe

- **GIVEN** the operating system is Windows and `getCliPath('codex')` resolves to `C:\nvm4w\nodejs\codex.cmd`
- **WHEN** `invokeCli('codex', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === 'cmd.exe'` and `args === ['/d', '/s', '/c', 'C:\\nvm4w\\nodejs\\codex.cmd']`

#### Scenario: Windows .bat path is wrapped with cmd.exe

- **GIVEN** the operating system is Windows and `getCliPath('claude')` resolves to `C:\tools\claude.bat`
- **WHEN** `invokeCli('claude', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === 'cmd.exe'` and `args === ['/d', '/s', '/c', 'C:\\tools\\claude.bat']`

#### Scenario: Windows .exe path is spawned directly

- **GIVEN** the operating system is Windows and `getCliPath('codex')` resolves to `C:\Program Files\Anthropic\codex.exe`
- **WHEN** `invokeCli('codex', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === 'C:\\Program Files\\Anthropic\\codex.exe'` and `args === []`, with no cmd.exe wrapping

#### Scenario: POSIX path is spawned directly

- **GIVEN** the operating system is Linux or macOS and `getCliPath('codex')` resolves to `/usr/local/bin/codex`
- **WHEN** `invokeCli('codex', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === '/usr/local/bin/codex'` and `args === []`, identical to the pre-fix behavior

#### Scenario: Stderr propagation through cmd.exe wrapper

- **GIVEN** a Windows `.cmd` path is wrapped with cmd.exe and the underlying child process writes the literal text `boom` to stderr and exits with code 1
- **WHEN** `invokeCli` observes the close event from the cmd.exe child
- **THEN** the returned promise SHALL reject with a `CliExecutionError` whose `exitCode === 1` and whose stderr field contains the literal text `boom`, with no cmd.exe-injected lines preceding the captured stderr

##### Example: dispatch table for spawn arguments

| Platform | cliPath | spawnFn command | spawnFn args |
| -------- | ------- | --------------- | ------------ |
| win32 | `C:\a\codex.cmd` | `cmd.exe` | `['/d','/s','/c','C:\\a\\codex.cmd']` |
| win32 | `C:\a\codex.bat` | `cmd.exe` | `['/d','/s','/c','C:\\a\\codex.bat']` |
| win32 | `C:\a\codex.exe` | `C:\\a\\codex.exe` | `[]` |
| linux | `/usr/local/bin/codex` | `/usr/local/bin/codex` | `[]` |
| darwin | `/opt/homebrew/bin/codex` | `/opt/homebrew/bin/codex` | `[]` |

### Requirement: resolveCliPath SHALL self-heal Windows cli.json caches whose path lacks an executable extension

When `resolveCliPath(source)` is invoked on Windows and the persisted `cli.json` contains a non-empty path for the requested source, the resolver SHALL first verify that the path ends with one of the executable extensions `.cmd`, `.exe`, or `.bat` (case-insensitive). If the extension is invalid (typical case: an unsuffixed Unix shim such as `C:\nvm4w\nodejs\codex` written to cache by an earlier defective version of `cliDetector`), the resolver SHALL treat the cached path as stale, MUST NOT call `pathExists` on it, and SHALL fall through to `cliDetector.detectCli(source)` to obtain a fresh path. After detection, the resolver MUST persist the detection result back to `cli.json` by updating the corresponding source field (`codex` or `claude`) and refreshing the `lastDetectedAt` field to the current ISO timestamp. The other source's field MUST NOT be modified during this self-heal write. The persisted write MUST go through the existing `writeCliSettings` path (atomic write, UTF-8, no BOM). If the write fails (e.g., permission denied), the resolver MUST swallow the error and still return the detected path so the in-flight `ai:invoke` succeeds; the next launch SHALL retry the self-heal. On non-Windows platforms, the extension check SHALL NOT be applied — the resolver SHALL retain the existing behavior of accepting any cached path that passes `pathExists`. The codex source and claude source SHALL be handled identically.

#### Scenario: Windows codex cache without extension is replaced by detected .cmd path

- **GIVEN** the operating system is Windows and `cli.json` contains `{ codex: "C:\\nvm4w\\nodejs\\codex", claude: "C:\\nvm4w\\nodejs\\claude.cmd", lastDetectedAt: "2026-05-15T18:31:26.968Z" }`, and `detect("codex")` resolves to `"C:\\nvm4w\\nodejs\\codex.cmd"`
- **WHEN** `resolveCliPath("codex", deps)` is invoked
- **THEN** the function SHALL return `"C:\\nvm4w\\nodejs\\codex.cmd"`, `writeSettings` SHALL be called exactly once with `codex = "C:\\nvm4w\\nodejs\\codex.cmd"`, `claude = "C:\\nvm4w\\nodejs\\claude.cmd"` (unchanged), and `lastDetectedAt` set to `nowIso()` output

#### Scenario: Windows claude cache without extension is replaced symmetrically

- **GIVEN** the operating system is Windows and `cli.json` contains `{ codex: "C:\\nvm4w\\nodejs\\codex.cmd", claude: "C:\\nvm4w\\nodejs\\claude", lastDetectedAt: "2026-05-15T18:31:26.968Z" }`, and `detect("claude")` resolves to `"C:\\nvm4w\\nodejs\\claude.cmd"`
- **WHEN** `resolveCliPath("claude", deps)` is invoked
- **THEN** the function SHALL return `"C:\\nvm4w\\nodejs\\claude.cmd"`, `writeSettings` SHALL be called once with `claude = "C:\\nvm4w\\nodejs\\claude.cmd"`, `codex = "C:\\nvm4w\\nodejs\\codex.cmd"` (unchanged), and `lastDetectedAt` refreshed

#### Scenario: Windows valid cached path is returned without re-detection

- **GIVEN** the operating system is Windows and `cli.json` contains `codex = "C:\\path\\codex.cmd"`, and `pathExists("C:\\path\\codex.cmd")` returns true
- **WHEN** `resolveCliPath("codex", deps)` is invoked
- **THEN** the function SHALL return `"C:\\path\\codex.cmd"`, SHALL NOT invoke `detect`, and SHALL NOT invoke `writeSettings`

#### Scenario: Windows invalid cache and detection both fail still persists null to break the loop

- **GIVEN** the operating system is Windows and `cli.json` contains `codex = "C:\\nvm4w\\nodejs\\codex"` (no extension), and `detect("codex")` resolves to `null`
- **WHEN** `resolveCliPath("codex", deps)` is invoked
- **THEN** the function SHALL return `null`, `writeSettings` SHALL be called once with `codex = null`, `lastDetectedAt` refreshed, so the next launch's `readSettings` will not re-encounter the same stale cache

#### Scenario: Windows missing cli.json triggers detection and creates a fresh file

- **GIVEN** the operating system is Windows, `readSettings` returns `EMPTY_CLI_SETTINGS` (file missing), and `detect("codex")` resolves to `"C:\\path\\codex.cmd"`
- **WHEN** `resolveCliPath("codex", deps)` is invoked
- **THEN** the function SHALL return `"C:\\path\\codex.cmd"`, and `writeSettings` SHALL be called once with `codex = "C:\\path\\codex.cmd"`, `claude = null`, and `lastDetectedAt` set to current time

#### Scenario: POSIX cached path without extension is still accepted

- **GIVEN** the operating system is Linux or macOS and `cli.json` contains `codex = "/usr/local/bin/codex"` (no extension, by POSIX convention), and `pathExists("/usr/local/bin/codex")` returns true
- **WHEN** `resolveCliPath("codex", deps)` is invoked
- **THEN** the function SHALL return `"/usr/local/bin/codex"`, SHALL NOT invoke `detect`, SHALL NOT invoke `writeSettings`, and the extension check SHALL NOT be applied

#### Scenario: cli.json write failure does not block the in-flight call

- **GIVEN** the operating system is Windows, `cli.json` contains `codex = "C:\\nvm4w\\nodejs\\codex"`, `detect("codex")` resolves to `"C:\\nvm4w\\nodejs\\codex.cmd"`, and `writeSettings` rejects with a permission error
- **WHEN** `resolveCliPath("codex", deps)` is invoked
- **THEN** the function SHALL still return `"C:\\nvm4w\\nodejs\\codex.cmd"` (the in-flight `ai:invoke` proceeds), and the rejection from `writeSettings` SHALL be swallowed

##### Example: isUsableCliPath truth table

| Platform | path | isUsableCliPath |
| -------- | ---- | --------------- |
| win32 | `C:\a\codex.cmd` | `true` |
| win32 | `C:\a\codex.CMD` | `true` |
| win32 | `C:\a\codex.exe` | `true` |
| win32 | `C:\a\codex.bat` | `true` |
| win32 | `C:\nvm4w\nodejs\codex` | `false` |
| win32 | `C:\a\codex.ps1` | `false` |
| win32 | `C:\a\codex.txt` | `false` |
| linux | `/usr/local/bin/codex` | `true` |
| linux | `/usr/local/bin/codex.sh` | `true` |
| darwin | `/opt/homebrew/bin/codex` | `true` |
