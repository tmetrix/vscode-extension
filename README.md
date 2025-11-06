# TMetrix - Time Tracking for VS Code

TMetrix is a lightweight time tracking extension that automatically monitors your coding activity and sends detailed metrics to your TMetrix server.

## Features

- **Automatic Time Tracking**: Tracks your active coding time without manual intervention
- **Smart Inactivity Detection**: Automatically stops tracking when you're inactive
- **Project Detection**: Intelligently identifies projects using git repositories or project markers
- **Multi-Platform Support**: Works on Windows, Linux, and macOS
- **File-Level Tracking**: Records which files you're working on
- **Configurable**: Customize API endpoint, inactivity threshold, and logging intervals

## Requirements

- A running TMetrix server (default: `http://localhost:9898`)
- TMetrix API Key

## Installation

1. Install the extension from the VS Code Marketplace
2. Reload VS Code
3. On first activation, you'll be prompted to enter your TMetrix API Key
4. Start coding! The extension will automatically track your time

## Extension Settings

This extension contributes the following settings:

* `tmetrix.apiEndpoint`: TMetrix API server endpoint URL (default: `http://localhost:9898`)
* `tmetrix.inactivityThreshold`: Inactivity threshold in seconds before stopping time tracking (default: `5`)
* `tmetrix.loggingInterval`: Interval in seconds for sending activity data to server (default: `60`)

## Commands

This extension contributes the following command:

* `TMetrix: Set API Key`: Set or update your TMetrix API key

## How It Works

1. **Project Initialization**: On startup, TMetrix identifies your project by checking for:
   - Git repository information
   - Project markers (`package.json`, `pyproject.toml`, `pom.xml`, `Cargo.toml`)
   
2. **Activity Tracking**: The extension tracks time only when you're actively typing in files
   - Starts timer on text changes
   - Stops on inactivity, window blur, or file switching
   
3. **Data Submission**: Periodically sends activity data to your TMetrix server including:
   - Project ID
   - Active coding seconds
   - Current file path
   - Editor type and OS information

## Privacy

All tracking data is sent only to your configured TMetrix server. No data is sent to third parties.

## Known Issues

- Requires a TMetrix server to be running and accessible
- First-time setup requires manual API key entry

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

### 0.1.0

Initial release of TMetrix extension:
- Automatic time tracking
- Project detection via git and project markers
- Configurable API endpoint and tracking parameters
- Activity monitoring with smart inactivity detection

## Support

For issues, feature requests, or questions, please visit our [GitHub repository](https://github.com/tmetrix/integrations/issues).

---

**Enjoy tracking your coding time with TMetrix!** ⏱️


## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
