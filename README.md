# TMetrix - Time Tracking for VS Code

TMetrix is a lightweight time tracking extension that automatically monitors your coding activity and sends detailed metrics to your TMetrix server.

## Features

- **Automatic Time Tracking**: Tracks your active coding time without manual intervention
- **Comprehensive Activity Tracking**: Monitors various editor activities:
  - **Coding**: Active typing and text editing with time tracking
  - **File Operations**: Opening and closing files
  - **Navigation**: Scrolling and moving through code
  - **Text Selection**: Selecting code for copying or reading
  - **Debug Sessions**: Starting and stopping debugger
  - **Terminal Usage**: Opening terminals and terminal state changes
  - **File Switching**: Changing between different files
- **Smart Inactivity Detection**: Automatically stops tracking when you're inactive
- **Project Detection**: Intelligently identifies projects using git repositories or project markers
- **Multi-Platform Support**: Works on Windows, Linux, and macOS
- **File-Level Tracking**: Records which files you're working on
- **Rich Metadata**: Sends contextual information with each activity (language, line counts, session details, etc.)
- **Configurable**: Customize API endpoint, inactivity threshold, and logging intervals

## Requirements

- TMetrix API Key

## Installation

1. Install the extension from the VS Code Marketplace
3. On first activation, ctrl + shift + p and enter your TMetrix API Key (https://tmetrix.site)
4. Start coding! The extension will automatically track your time

## Commands

This extension contributes the following command:

* `TMetrix: Set API Key`: Set or update your TMetrix API key

## How It Works

1. **Project Initialization**: On startup, TMetrix identifies your project by checking for:
   - Git repository information
   - Project markers (`package.json`, `pyproject.toml`, `pom.xml`, `Cargo.toml`)
   
2. **Activity Tracking**: The extension tracks multiple types of activities with time measurement:
   - **Coding Time**: Tracks time when you're actively typing in files (original functionality)
   - **Text Selection**: Tracks time spent selecting text (e.g., for copying or reading)
   - **Navigation**: Tracks time spent scrolling and navigating through code
   - **Debug Sessions**: Tracks time spent in debug mode
   - **Terminal Activity**: Tracks time spent working in terminal
   
3. **Smart Time Tracking**:
   - Each activity type has its own independent timer
   - Multiple activities can be tracked simultaneously
   - Automatic inactivity detection stops timers when idle
   - All activities send their accumulated time (in seconds) to the API
   
4. **Smart Throttling**: To avoid overwhelming the API, certain high-frequency activities use throttling:
   - Text selections: 2 seconds between detections
   - Navigation events: 3 seconds between detections
   - Terminal state changes: 3 seconds between detections
   
5. **Data Submission**: Periodically sends activity data to your TMetrix server including:
   - Project ID
   - Activity time in seconds
   - Current file path
   - Editor type and OS information

## Privacy

All tracking data is sent only to your configured TMetrix server. No data is sent to third parties.

---

**Enjoy tracking your coding time with TMetrix!** ⏱️