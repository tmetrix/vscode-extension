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

- TMetrix API Key

## Installation

1. Install the extension from the VS Code Marketplace
3. On first activation, ctrl + shift + p and enter your TMetrix API Key (http://144.31.69.55:3000)
4. Start coding! The extension will automatically track your time

## Extension Settings

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

---

**Enjoy tracking your coding time with TMetrix!** ⏱️