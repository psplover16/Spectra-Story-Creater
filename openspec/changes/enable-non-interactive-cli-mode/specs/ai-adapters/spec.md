## ADDED Requirements

### Requirement: Main process MUST spawn AI CLI subprocesses with a source-specific non-interactive subcommand

When the main process spawns an AI CLI subprocess via `cliInvoker.invokeCli(source, ...)`, the spawn argument list MUST include a source-specific non-interactive trigger as the final argument(s) so the CLI accepts a piped (non-TTY) stdin and produces a single response per invocation. The trigger SHALL be appended after any platform wrapping arguments (such as `cmd.exe /d /s /c <cliPath>` on Windows for `.cmd` / `.bat` shims) so that cmd.exe forwards it to the underlying CLI binary.

The source-to-trigger mapping is fixed:

- `source === 'codex'` → append the literal argument `exec`
- `source === 'claude'` → append the literal argument `-p`

The prompt MUST continue to be delivered through `child.stdin.write(input.prompt)` followed by `child.stdin.end()`; the prompt MUST NOT be passed via argv. The existing contracts of `cliInvoker.invokeCli` — successful path returning `AiInvokeResult`, the three error classes (`CliUnavailableError`, `CliExecutionError`, `CliTimeoutError`), the 30-second default timeout, the `SPECTRA_AI_TIMEOUT_MS` environment override, and the UTF-8 environment from `buildSpawnEnv()` — MUST all remain semantically equivalent.

The mapping applies uniformly across platforms (win32 / linux / darwin) and across the existing dispatch branches (cmd.exe wrapping for `.cmd` / `.bat` on Windows, direct spawn for `.exe` on Windows, direct spawn on POSIX).

#### Scenario: Windows codex .cmd shim wraps cmd.exe and appends exec

- **GIVEN** the operating system is Windows and `getCliPath('codex')` resolves to `C:\nvm4w\nodejs\codex.cmd`
- **WHEN** `invokeCli('codex', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === 'cmd.exe'` and `args === ['/d', '/s', '/c', 'C:\\nvm4w\\nodejs\\codex.cmd', 'exec']`

#### Scenario: Windows claude .cmd shim wraps cmd.exe and appends -p

- **GIVEN** the operating system is Windows and `getCliPath('claude')` resolves to `C:\nvm4w\nodejs\claude.cmd`
- **WHEN** `invokeCli('claude', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === 'cmd.exe'` and `args === ['/d', '/s', '/c', 'C:\\nvm4w\\nodejs\\claude.cmd', '-p']`

#### Scenario: Windows codex .exe is spawned directly with exec

- **GIVEN** the operating system is Windows and `getCliPath('codex')` resolves to `C:\Program Files\Anthropic\codex.exe`
- **WHEN** `invokeCli('codex', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === 'C:\\Program Files\\Anthropic\\codex.exe'` and `args === ['exec']`

#### Scenario: POSIX codex is spawned directly with exec

- **GIVEN** the operating system is Linux or macOS and `getCliPath('codex')` resolves to `/usr/local/bin/codex`
- **WHEN** `invokeCli('codex', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === '/usr/local/bin/codex'` and `args === ['exec']`

#### Scenario: POSIX claude is spawned directly with -p

- **GIVEN** the operating system is Linux or macOS and `getCliPath('claude')` resolves to `/opt/homebrew/bin/claude`
- **WHEN** `invokeCli('claude', input, deps)` reaches the spawn step
- **THEN** the injected `spawnFn` SHALL be called once with `command === '/opt/homebrew/bin/claude'` and `args === ['-p']`

#### Scenario: prompt is still delivered through stdin, not argv

- **GIVEN** any valid `(source, cliPath)` combination and an `input.prompt` value of `"hello world"`
- **WHEN** `invokeCli(source, input, deps)` runs
- **THEN** the child process SHALL receive the prompt via `child.stdin.write("hello world")` followed by `child.stdin.end()`, and the argv passed to `spawnFn` MUST NOT contain the prompt string

#### Scenario: CLI subprocess no longer aborts with "stdin is not a terminal"

- **GIVEN** the operating system is Windows, the resolved cliPath is `C:\nvm4w\nodejs\codex.cmd`, and codex CLI is installed and the user has previously run `codex login` successfully
- **WHEN** `invokeCli('codex', input, deps)` runs against the real codex binary
- **THEN** the child process SHALL NOT exit with stderr containing `Error: stdin is not a terminal`; the spawn args including the trailing `exec` SHALL satisfy codex's non-interactive mode requirement

##### Example: dispatch table for spawn arguments (full 4-dimensional cross)

| Platform | source | cliPath | spawnFn command | spawnFn args |
| -------- | ------ | ------- | --------------- | ------------ |
| win32 | codex | `C:\a\codex.cmd` | `cmd.exe` | `['/d','/s','/c','C:\\a\\codex.cmd','exec']` |
| win32 | codex | `C:\a\codex.bat` | `cmd.exe` | `['/d','/s','/c','C:\\a\\codex.bat','exec']` |
| win32 | codex | `C:\a\codex.exe` | `C:\\a\\codex.exe` | `['exec']` |
| win32 | claude | `C:\a\claude.cmd` | `cmd.exe` | `['/d','/s','/c','C:\\a\\claude.cmd','-p']` |
| win32 | claude | `C:\a\claude.bat` | `cmd.exe` | `['/d','/s','/c','C:\\a\\claude.bat','-p']` |
| win32 | claude | `C:\a\claude.exe` | `C:\\a\\claude.exe` | `['-p']` |
| linux | codex | `/usr/local/bin/codex` | `/usr/local/bin/codex` | `['exec']` |
| linux | claude | `/usr/local/bin/claude` | `/usr/local/bin/claude` | `['-p']` |
| darwin | codex | `/opt/homebrew/bin/codex` | `/opt/homebrew/bin/codex` | `['exec']` |
| darwin | claude | `/opt/homebrew/bin/claude` | `/opt/homebrew/bin/claude` | `['-p']` |

### Requirement: Default ai:invoke timeout SHALL be 120 seconds

The default timeout used by `cliInvoker.invokeCli` when no explicit `timeoutMs` is supplied in deps and no `SPECTRA_AI_TIMEOUT_MS` environment variable is set MUST be `120000` milliseconds (120 seconds). The `SPECTRA_AI_TIMEOUT_MS` environment variable override mechanism MUST remain functional: a valid positive integer string in `SPECTRA_AI_TIMEOUT_MS` overrides the default; an explicit `timeoutMs` in deps overrides both. This supersedes the legacy 30-second default written into `register-ai-subprocess-handlers`, which was an early estimate for mock-test latency that proved insufficient for real LLM calls carrying full novel context (chapter scene, worldview, present characters) where end-to-end LLM round-trip on GPT-5.5 / Claude 4.x routinely lands in the 30–90 second range and occasionally crosses 110 seconds.

#### Scenario: default timeout is 120000 when no override is set

- **GIVEN** `SPECTRA_AI_TIMEOUT_MS` is unset, deps does not contain `timeoutMs`, and the spawned child never closes
- **WHEN** `invokeCli('codex', input, deps)` is called and time advances past 120000ms
- **THEN** the function SHALL reject with a `CliTimeoutError` whose `timeoutMs === 120000`, and SHALL NOT reject earlier than 120000ms

#### Scenario: SPECTRA_AI_TIMEOUT_MS still overrides the new default

- **GIVEN** the environment variable `SPECTRA_AI_TIMEOUT_MS = "5000"` is set and deps does not contain an explicit `timeoutMs`
- **WHEN** `invokeCli` is called and the spawned child never closes
- **THEN** the effective timeout SHALL be 5000ms, not 120000ms

#### Scenario: explicit deps.timeoutMs overrides both env and new default

- **GIVEN** `SPECTRA_AI_TIMEOUT_MS = "5000"` is set and deps contains `timeoutMs: 100`
- **WHEN** `invokeCli` is called
- **THEN** the effective timeout SHALL be 100ms (deps wins over env, env wins over default)
