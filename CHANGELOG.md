# Change Log

All notable changes to the TMetrix extension will be documented in this file.

## [0.1.2] - 2025-11-16

### Fixed
- Send activity request

## [0.1.1] - 2025-11-10

### Fixed
- Prompting api key


## [0.1.0] - 2025-11-06

### Added
- Initial release of TMetrix time tracking extension
- Automatic coding time tracking based on active typing
- Smart inactivity detection (configurable threshold)
- Project identification via git repository or project markers
- File-level activity tracking
- Configurable API endpoint for TMetrix server
- Configurable inactivity threshold and logging interval
- Command: "TMetrix: Show Coding Statistics" - displays current session time
- Command: "TMetrix: Reset API Key" - resets stored API credentials
- Support for Windows, Linux, and macOS
- Periodic data submission to TMetrix server
- API key management with secure storage
- Activity tracking pauses on window blur or file switching
- Output channel for debugging and monitoring

### Technical Details
- Tracks time only during active typing in file-based documents
- Sends activity data including project ID, file path, seconds, editor type, and OS
- Automatic project creation on TMetrix server if not found
- Workspace-level project ID storage
- Global API key storage
