# scoped-node-administration Specification

## Purpose
TBD - created by archiving change ysu-node-permissions-and-login. Update Purpose after archive.

## Requirements

### Requirement: Resource-scoped authorization
The panel SHALL distinguish global superadmins, admins of explicitly selected daemon UUIDs and users of explicitly assigned instances.

#### Scenario: Node administrator operates an assigned node
- **WHEN** a node admin lists instances or opens a console on an assigned daemon
- **THEN** the panel permits operations and returns information only for authorized resources

#### Scenario: Mixed-scope request
- **WHEN** any requested batch member belongs to an unauthorized daemon or instance
- **THEN** the panel denies the batch before sending commands

#### Scenario: Global configuration
- **WHEN** a node admin requests account management, a daemon key or host-wide settings
- **THEN** the panel denies the request, including through API-key and ticket endpoints

#### Scenario: Existing accounts
- **WHEN** an existing instance user signs in after the upgrade
- **THEN** each assigned daemon and instance pair remains accessible and no node-wide grant is added

#### Scenario: Assignments
- **WHEN** a superadmin changes which nodes an admin manages
- **THEN** subsequent requests enforce the updated grants and the UI reflects the new scope
