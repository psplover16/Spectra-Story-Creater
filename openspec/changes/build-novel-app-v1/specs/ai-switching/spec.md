## ADDED Requirements

### Requirement: Four-tier resolver

The system SHALL define an `AiResolver` that, given a `ResolveQuery { role, characterId?, paragraphId? }`, returns a `ResolveResult { adapter, hitLayer, reason }`. The resolver SHALL consult bindings in this fixed priority order, returning on the first match: paragraph override (`paragraph`), role binding (`role`), character binding (`character`), global default (`global`).

#### Scenario: Paragraph override wins

- **GIVEN** paragraph p1 has override `claude`, role plot-driver is bound to `codex`, character c1 is bound to `codex`, global default is `codex`
- **WHEN** the resolver is queried with `{ role: 'plot-driver', characterId: 'c1', paragraphId: 'p1' }`
- **THEN** the result is `{ adapter: ClaudeAdapter, hitLayer: 'paragraph', reason: 'paragraph override p1 -> claude' }`

#### Scenario: Fall through to global default

- **GIVEN** no override is set on paragraph p1, no role binding for worldbuilding, no character binding for c2, global default is `claude`
- **WHEN** the resolver is queried with `{ role: 'worldbuilding', characterId: 'c2', paragraphId: 'p1' }`
- **THEN** the result is `{ adapter: ClaudeAdapter, hitLayer: 'global', reason: 'global default -> claude' }`

### Requirement: Six functional roles each individually bindable

The system SHALL recognize exactly six AI roles: `plot-driver`, `character-voice`, `worldbuilding`, `character-design`, `outline-assistant`, `consistency-auditor`. Each role SHALL be independently bindable to either `codex` or `claude`.

#### Scenario: Each role can be bound separately

- **WHEN** the user binds plot-driver to `claude` and worldbuilding to `codex`
- **THEN** queries for plot-driver resolve to `ClaudeAdapter` and queries for worldbuilding (with no paragraph or character overrides) resolve to `CodexAdapter`

#### Scenario: Reject unknown role

- **WHEN** the resolver is queried with a role string not in the fixed six
- **THEN** the resolver raises `UnknownRoleError` naming the offending value

### Requirement: Hit layer surfaced to UI

The system SHALL display the `hitLayer` and `reason` of the most recent AI invocation in the suggestion panel UI, so the user can see why a particular CLI was selected for that call.

#### Scenario: UI shows the binding reason

- **WHEN** a suggestion arrives whose resolver returned `hitLayer = 'role'` and `reason = 'role binding: plot-driver -> claude'`
- **THEN** the suggestion panel displays a line such as "本次由 Claude 產生（職能綁定：plot-driver）"

### Requirement: Binding storage on the active novel

The system SHALL persist paragraph overrides, role bindings, and character bindings inside the active novel's data files, and SHALL persist the global default in user-level settings shared across novels.

#### Scenario: Bindings travel with the novel folder

- **GIVEN** a novel with role binding plot-driver -> `claude`
- **WHEN** the user copies the novel folder to another machine and opens it there
- **THEN** the resolver on the destination machine returns the same binding for plot-driver

#### Scenario: Global default is per-machine

- **WHEN** the user sets global default to `claude` on machine A and opens a fresh workspace on machine B with global default `codex`
- **THEN** the resolver on machine B uses `codex` as the global default for novels without role or character bindings
