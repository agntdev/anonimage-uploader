# AnonImage Uploader — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that accepts images (single or multiple), uploads them anonymously to pre-selected free image hosts (Catbox, Imgur, 0x0.st, file.io), and returns shareable direct image links with optional view-page links. Focuses on fast, anonymous sharing with simple commands and no account required.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Casual Telegram users needing quick anonymous image hosting
- Chat groups/communities requiring ephemeral image sharing

## Success criteria

- Users can upload images and receive direct links within seconds
- Bot handles bulk uploads (up to 10 images) with clear grouped output
- Error handling reports failed hosts while returning successful uploads

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with upload options
- **/upload** (command, actor: user, command: /upload) — Initiate image upload process
- **/hosts** (command, actor: user, command: /hosts) — List enabled image hosts and their policies
- **/help** (command, actor: user, command: /help) — Show usage instructions and limits

## Flows

### One-off upload
_Trigger:_ User sends images directly

1. Receive image(s) via message or forward
2. Display ephemeral 'Uploading...' status
3. Return grouped links with host labels

_Data touched:_ Upload job

### Command-based upload
_Trigger:_ /upload

1. Prompt for image selection
2. Process upload to configured hosts
3. Format and return results

_Data touched:_ Upload job

### Host information
_Trigger:_ /hosts

1. List enabled hosts with notes on direct links/view pages and expiry policies

_Data touched:_ Host provider

### Error handling
_Trigger:_ Host upload failure

1. Note failed host in results
2. Include successful host links
3. Add expiration warnings where applicable

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Telegram User** _(retention: persistent (30 days))_ — User identified by Telegram ID
  - fields: telegram_id, last_upload_timestamp
- **Upload Job** _(retention: persistent (30 days))_ — Record of user-submitted images and results
  - fields: telegram_id, timestamp, original_filenames, hosts_attempted, resulting_urls, per_host_status
- **Host Provider** _(retention: none)_ — External image hosting service
  - fields: name, direct_link_support, expiry_policy

## Integrations

- **Catbox** (required) — Direct image hosting with minimal metadata
- **Imgur** (required) — Anonymous public hosting with larger audience reach
- **0x0.st** (required) — Minimalist direct-link hosting
- **file.io** (required) — Ephemeral link hosting
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure enabled hosts (Catbox, Imgur, 0x0.st, file.io)
- Set max images per upload (default 10)
- Adjust upload retention period (default 30 days)
- Define rate limits per user (uploads/minute/day)

## Notifications

- Post results directly in the same Telegram chat where images were uploaded

## Permissions & privacy

- No user accounts or personal data stored beyond Telegram ID
- Upload metadata retained for 30 days for abuse tracking
- No de-anonymization or content scanning beyond basic validation

## Edge cases

- Exceeding max images per upload (10) - show error
- Host-specific upload rejections - report inline but return other links
- Rate limit violations - temporary upload blocking

## Required tests

- End-to-end upload flow with multiple images
- Host failure handling with partial success
- Bulk upload (10 images) grouping validation
- /hosts command output formatting

## Assumptions

- Default hosts selected for anonymity and reliability
- 30-day retention balances debugging and privacy
- Rate limits will be implemented but exact thresholds unspecified
