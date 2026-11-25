## MODIFIED Requirements

### Requirement: Enterprise Feishu authentication
The panel SHALL grant superadmin access only after verifying the configured Feishu enterprise, the browser login transaction and the player's chosen panel name.

#### Scenario: Configured enterprise member
- **WHEN** an enabled member with a confirmed panel name completes the verified callback
- **THEN** the panel establishes a superadmin session for the same account UUID and provider subject.

#### Scenario: Invalid login
- **WHEN** the callback is replayed, comes from another tenant, or lacks the browser login state
- **THEN** the panel rejects it without creating a privileged identity.

#### Scenario: Name needed
- **WHEN** a new or previously auto-named player returns from a verified Feishu login
- **THEN** the panel presents name selection and grants access to management operations only after the player saves a valid available name.

## ADDED Requirements

### Requirement: Primary and secondary login options
The panel SHALL present configured YSU providers first and expose the permitted local password flow through a secondary control.

#### Scenario: Local account with optional two-factor authentication
- **WHEN** a user selects the secondary option on desktop or mobile
- **THEN** the existing password and two-factor flow is available with its existing server policy, sessions, grants and API-key behavior.

#### Scenario: Provider configuration
- **WHEN** the login page opens
- **THEN** it offers the configured providers and keeps permitted local sign-in reachable even when provider discovery fails.

### Requirement: Feishu account names
The panel SHALL let a verified Feishu player choose and later edit their own unique account name.

#### Scenario: First name or later rename
- **WHEN** the player saves an available valid name
- **THEN** the account list, personal settings and subsequent logins use the chosen name with the same account UUID and grants.

#### Scenario: Conflict or invalid input
- **WHEN** the name is invalid, reserved by an existing account or claimed concurrently
- **THEN** the panel reports the relevant error, keeps existing assignments and lets the player try another name.

#### Scenario: Legacy grants
- **WHEN** a player chooses a name matching a historical panel account
- **THEN** the panel preserves both identities separately and refuses the conflicting name.
