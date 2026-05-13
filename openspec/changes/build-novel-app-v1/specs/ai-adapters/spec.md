## ADDED Requirements

### Requirement: AiAdapter abstract interface

The system SHALL define an `AiAdapter` interface exposing a `source: 'codex' | 'claude'` field and an `invoke(input: AiInvokeInput): Promise<AiInvokeResult>` method, where `AiInvokeInput` SHALL contain an `AssembledContext`, a `prompt: string`, and a `role: AiRole`, and `AiInvokeResult` SHALL contain `text`, optional `tokensUsed`, `source`, and `durationMs`.

#### Scenario: Adapter returns result on success

- **WHEN** any concrete adapter completes a successful CLI invocation
- **THEN** the returned `AiInvokeResult.source` matches the adapter's `source` field and `text` contains the CLI stdout decoded as UTF-8

### Requirement: Codex CLI adapter via child_process

The system SHALL implement a `CodexAdapter` that calls the local `codex` CLI binary through Node.js `child_process.spawn` from the Electron main process, passing the assembled context and prompt through standard input or command-line arguments as required by the CLI, and decoding standard output as UTF-8.

#### Scenario: Successful Codex invocation

- **WHEN** the local Codex CLI is installed and returns exit code 0 with a UTF-8 stdout payload
- **THEN** the adapter resolves the returned Promise with `source = 'codex'` and `text` equal to the stdout payload

#### Scenario: Codex CLI not installed

- **WHEN** spawning `codex` fails with ENOENT
- **THEN** the adapter rejects the Promise with `CliUnavailableError` carrying the CLI name "codex"

### Requirement: Claude Code adapter via child_process

The system SHALL implement a `ClaudeAdapter` that calls the local `claude` CLI binary through Node.js `child_process.spawn` from the Electron main process, with the same input and output contract as `CodexAdapter` but with `source = 'claude'`.

#### Scenario: Successful Claude invocation

- **WHEN** the local Claude Code CLI is installed and returns exit code 0 with a UTF-8 stdout payload
- **THEN** the adapter resolves the returned Promise with `source = 'claude'` and `text` equal to the stdout payload

#### Scenario: Claude CLI returns non-zero exit code

- **WHEN** the CLI returns a non-zero exit code with stderr content "rate limited"
- **THEN** the adapter rejects the Promise with `CliExecutionError` carrying `exitCode`, `stderr`, and the CLI name "claude"

### Requirement: No direct HTTP calls to LLM vendor APIs

The system SHALL NOT include any code path that issues an HTTP request to LLM vendor endpoints, including but not limited to `api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`. All AI invocations MUST go through the local CLI adapters defined above.

#### Scenario: Static check passes

- **WHEN** an analyzer or grep over the source tree (excluding tests and documentation) searches for the above hostnames
- **THEN** zero matches are found

### Requirement: CLI unavailable surfaces to UI as a recoverable prompt

The system SHALL convert `CliUnavailableError` and `CliExecutionError` raised from any adapter into a UI prompt asking the user whether to retry the same CLI, switch to the other CLI for this single invocation, or cancel. The system SHALL NOT silently fall back to a different CLI.

#### Scenario: Codex fails and user picks Claude

- **WHEN** a Codex invocation raises `CliExecutionError` and the user selects "switch to Claude for this call"
- **THEN** the system re-invokes the same `AiInvokeInput` against `ClaudeAdapter` and the resulting `AiInvokeResult.source` is `'claude'`

#### Scenario: Both CLIs unavailable

- **WHEN** the user retries with the other CLI and that CLI also raises `CliUnavailableError`
- **THEN** the system shows a terminal error explaining both CLIs failed, and the original request resolves to a failure state visible in the UI
