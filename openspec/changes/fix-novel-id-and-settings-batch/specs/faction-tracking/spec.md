## MODIFIED Requirements

### Requirement: Faction membership tracking

The system SHALL maintain a derived membership view that lists characters whose `factionIds` array contains a given faction id. The view SHALL update whenever a character's `factionIds` is changed.

#### Scenario: Membership reflects character changes

- **GIVEN** faction "天地會" with two members
- **WHEN** the user appends "天地會" to a third character's `factionIds`
- **THEN** the faction's membership view immediately shows three members without requiring a page refresh

#### Scenario: Multi-faction membership

- **GIVEN** character "韋小寶" with `factionIds = ["天地會", "鰲拜黨"]`
- **WHEN** the user opens the membership view of faction "天地會"
- **THEN** the view lists 韋小寶 as a member, and opening the membership view of faction "鰲拜黨" also lists 韋小寶 as a member

## ADDED Requirements

### Requirement: Faction member CRUD from members view

The system SHALL allow the user to add or remove characters as members of a faction directly from the faction's members view. Adding a member SHALL append the current faction id to the target character's `factionIds` if it is not already present. Removing a member SHALL remove only the current faction id from the target character's `factionIds`, and SHALL leave the character's membership in any other faction intact. After each add or remove, the system SHALL persist the modified character file and SHALL refresh the members view without requiring a page reload.

#### Scenario: Add a member from the members view

- **GIVEN** character "茅十八" with `factionIds = []` and faction "天地會"
- **WHEN** the user picks "茅十八" from the add-member control in the members view of "天地會"
- **THEN** the system writes 茅十八's character file with `factionIds = ["天地會"]` and the members view of "天地會" lists 茅十八 immediately

#### Scenario: Remove a member without losing other faction memberships

- **GIVEN** character "韋小寶" with `factionIds = ["天地會", "皇室"]`
- **WHEN** the user presses the remove-member control next to "韋小寶" in the members view of "天地會"
- **THEN** the system writes 韋小寶's character file with `factionIds = ["皇室"]`, the members view of "天地會" no longer lists 韋小寶, and the members view of "皇室" still lists 韋小寶

#### Scenario: Add a member who already belongs to the faction is a no-op

- **GIVEN** character "韋小寶" with `factionIds = ["天地會"]`
- **WHEN** the user picks "韋小寶" again from the add-member control in the members view of "天地會"
- **THEN** the system SHALL NOT duplicate the faction id in the character's `factionIds`, and the character file SHALL remain `factionIds = ["天地會"]`
