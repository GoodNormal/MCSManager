# ysu-provider-login Specification

## Purpose
Define how panel users sign in through Feishu, the YSUMC skin site or a local account, how verified provider roles map to panel access and how Feishu members manage their account name.

## Requirements

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

### Requirement: Skin role and departmental position
The skin integration SHALL return the verified subject, authoritative role and departmental position to its authorized panel client. The panel SHALL derive skin privileges from that identity.

#### Scenario: Site super administrator
- **WHEN** the skin site verifies a super administrator
- **THEN** the panel grants access to all nodes

#### Scenario: Selected node administrators
- **WHEN** the site verifies a skin administrator or a minister whose department is operations
- **THEN** the panel grants node administration of YSUMC and 公益服

#### Scenario: Other active users
- **WHEN** an ordinary member, operations member, or minister of another department signs in
- **THEN** the user receives only explicit instance grants

#### Scenario: Role changes
- **WHEN** a minister leaves the post or the account is disabled
- **THEN** the panel drops the obsolete provider grant by the next authorization refresh; a disabled identity cannot obtain a new session

#### Scenario: Identity privacy
- **WHEN** an unrelated client or a request naming another skin UID asks for departmental identity
- **THEN** the plugin refuses disclosure or privilege elevation

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
