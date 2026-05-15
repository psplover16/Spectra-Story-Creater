## ADDED Requirements

### Requirement: CLI executable path auto-detection and persistence

The system SHALL maintain a per-machine record of the resolved executable paths for Codex CLI and Claude Code, persisted to a user-level configuration file in the host operating system's user-data location for the application. On application startup and on the settings page mount, the system SHALL load this record. When the record is missing or any path field is empty, the system SHALL automatically detect the executable for the corresponding CLI by consulting the system PATH first and a list of well-known install locations as fallback, and SHALL persist the detected paths (writing `null` for any CLI that cannot be found). When a persisted path exists, the system SHALL verify the file presence of that path on every startup and SHALL re-run detection for any path that no longer resolves. The system SHALL allow the user to override either path manually from the settings UI; a manually saved value SHALL take precedence over future auto-detection, while remaining subject to startup presence verification.

#### Scenario: First launch with no persisted CLI record

- **GIVEN** the user launches the application and no CLI configuration file exists in the user-data location
- **WHEN** the application initializes the settings layer
- **THEN** the system SHALL run auto-detection for both Codex CLI and Claude Code, SHALL write the detected paths (or `null` for any CLI not found) to the configuration file, and the settings page SHALL display the detected values

#### Scenario: Subsequent launch with a still-valid persisted path

- **GIVEN** the CLI configuration file already records `codex = "C:/Users/u/AppData/Roaming/npm/codex.cmd"` and that file exists on disk
- **WHEN** the application starts
- **THEN** the system SHALL load the persisted path, verify its presence via filesystem access, and the settings page SHALL display the persisted value without re-running detection

#### Scenario: Subsequent launch where the persisted path has disappeared

- **GIVEN** the CLI configuration file records `codex = "C:/old/path/codex.cmd"` but that file is no longer present on disk
- **WHEN** the application starts
- **THEN** the system SHALL run auto-detection for Codex CLI, overwrite the configuration file with the newly detected value (or `null` if not found), and the settings page SHALL display the refreshed value

#### Scenario: Manual override takes precedence over auto-detection

- **GIVEN** the user has previously saved `claude = "/home/u/custom/claude"` through the settings UI
- **WHEN** the application starts and the path resolves on disk
- **THEN** the system SHALL retain the manually saved value and SHALL NOT overwrite it with an auto-detected value, even when the auto-detected value differs

#### Scenario: Auto-detection cannot find a CLI

- **GIVEN** neither the system PATH nor any well-known fallback location contains a Codex CLI binary on the host
- **WHEN** the system runs auto-detection for Codex CLI
- **THEN** the system SHALL persist `codex = null` to the configuration file, and the settings page SHALL display an indication that Codex CLI was not detected together with the unchanged Claude Code value
