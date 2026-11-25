## ADDED Requirements

### Requirement: Enterprise Feishu authentication
The panel SHALL grant superadmin to authenticated users of the configured Feishu enterprise application after verifying the tenant and the login transaction.

#### Scenario: Configured enterprise member
- **WHEN** the one-time callback and provider identity validate for the configured tenant
- **THEN** the panel establishes a superadmin session for that provider subject

#### Scenario: Invalid login
- **WHEN** the callback is replayed, comes from another tenant, or lacks the browser login state
- **THEN** the panel rejects it without creating a privileged identity

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

