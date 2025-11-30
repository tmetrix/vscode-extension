"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const PROJECT_ID_STORAGE_KEY = 'tmetrix.projectId';
const API_KEY_STORAGE_KEY = 'tmetrix.apiKey';
const vsconfig = vscode.workspace.getConfiguration('tmetrix');
const apiEndpoint = 'http://localhost:9898';
let project_uuid = null;
let api_key = null;
async function getProjectDetails(fileUri) {
    let searchStartPath = path.dirname(fileUri.fsPath);
    const projectMarkers = ['package.json', 'pyproject.toml', 'pom.xml', 'Cargo.toml'];
    let projectRoot = null;
    let currentPath = searchStartPath;
    while (currentPath !== path.dirname(currentPath)) {
        const gitPath = path.join(currentPath, '.git');
        if (fs.existsSync(gitPath)) {
            projectRoot = currentPath;
            break;
        }
        for (const marker of projectMarkers) {
            if (fs.existsSync(path.join(currentPath, marker))) {
                projectRoot = currentPath;
                break;
            }
        }
        if (projectRoot) {
            break;
        }
        currentPath = path.dirname(currentPath);
    }
    if (!projectRoot) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
        projectRoot = workspaceFolder ? workspaceFolder.uri.fsPath : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null);
        if (!projectRoot) {
            return { name: 'unknown_project', git_url: null };
        }
    }
    const projectName = path.basename(projectRoot);
    let gitUrl = null;
    if (fs.existsSync(path.join(projectRoot, '.git'))) {
        try {
            const { promisify } = require('util');
            const execAsync = promisify(child_process_1.exec);
            const { stdout } = await execAsync('git remote get-url origin', { cwd: projectRoot });
            gitUrl = stdout ? stdout.trim() : null;
        }
        catch (error) {
            console.error('Could not get git remote URL:', error);
        }
    }
    return { name: projectName, git_url: gitUrl };
}
function setProjectId(context, uuid) {
    project_uuid = uuid;
    context.workspaceState.update(PROJECT_ID_STORAGE_KEY, uuid);
}
async function getApiKey(context) {
    if (api_key) {
        return api_key;
    }
    const storedKey = context.globalState.get(API_KEY_STORAGE_KEY);
    if (storedKey) {
        api_key = storedKey;
        return storedKey;
    }
    return null;
}
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (api_key) {
        headers['X-API-KEY'] = api_key;
    }
    return headers;
}
async function checkProjectById(uuid, outputChannel) {
    try {
        const url = `${apiEndpoint}/extensions/projects/${encodeURIComponent(uuid)}`;
        outputChannel.appendLine(`[TMETRIX API] Checking project by ID: ${uuid}`);
        outputChannel.appendLine(`[TMETRIX API] Request URL: ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });
        outputChannel.appendLine(`[TMETRIX API] Check project by ID status: ${response.status}`);
        if (!response.ok) {
            const text = await response.text();
            outputChannel.appendLine(`[TMETRIX API] Error response: ${text}`);
        }
        return response.ok;
    }
    catch (e) {
        outputChannel.appendLine(`[TMETRIX API] Problem with check project by ID request: ${e.message}`);
        return false;
    }
}
async function getProjectByGitUrl(gitUrl, outputChannel) {
    try {
        const response = await fetch(`${apiEndpoint}/extensions/git-projects?git_url=${encodeURIComponent(gitUrl)}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        outputChannel.appendLine(`[TMETRIX API] Check project by git_url status: ${response.status}`);
        if (response.ok) {
            try {
                const data = await response.json();
                return data.project_id || null;
            }
            catch (e) {
                const text = await response.text();
                outputChannel.appendLine(`[TMETRIX API] Failed to parse get by git_url response: ${text}`);
                return null;
            }
        }
        return null;
    }
    catch (e) {
        outputChannel.appendLine(`[TMETRIX API] Problem with get by git_url request: ${e.message}`);
        return null;
    }
}
async function sendProjectCreationRequest(projectDetails, context, outputChannel) {
    try {
        const response = await fetch(`${apiEndpoint}/extensions/projects`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                'name': projectDetails.name,
                'git_url': projectDetails.git_url
            })
        });
        outputChannel.appendLine(`[TMETRIX API] Project creation request status: ${response.status}`);
        if (response.ok) {
            try {
                const data = await response.json();
                return data.project_id || null;
            }
            catch (e) {
                const text = await response.text();
                outputChannel.appendLine(`[TMETRIX API] Failed to parse project creation response: ${text}`);
            }
        }
        else {
            const errorText = await response.text();
            outputChannel.appendLine(`[TMETRIX API] Failed to create project: ${errorText}`);
        }
        return null;
    }
    catch (e) {
        outputChannel.appendLine(`[TMETRIX API] Problem with project creation request: ${e.message}`);
        return null;
    }
}
async function initializeProject(context, outputChannel) {
    // 1. Check local storage
    const localProjectId = context.workspaceState.get(PROJECT_ID_STORAGE_KEY);
    if (localProjectId) {
        outputChannel.appendLine(`Found local project ID: ${localProjectId}`);
        const isValid = await checkProjectById(localProjectId, outputChannel);
        if (isValid) {
            outputChannel.appendLine(`Project ID is valid on server. Initialization complete.`);
            setProjectId(context, localProjectId);
            return; // Explicitly exit after success
        }
        outputChannel.appendLine(`Project ID is not valid on server, clearing and re-identifying.`);
        setProjectId(context, null); // Clear invalid ID
    }
    // 2. If no valid local ID, identify by workspace details
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        outputChannel.appendLine(`No workspace folder open. Cannot initialize project.`);
        return;
    }
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const dummyFileUri = vscode.Uri.joinPath(workspaceFolder.uri, 'tmetrix_dummy_file');
    const projectDetails = await getProjectDetails(dummyFileUri);
    outputChannel.appendLine(`Identified project: ${projectDetails.name}, git: ${projectDetails.git_url || 'none'}`);
    // 3. Check server using git_url
    if (projectDetails.git_url) {
        const existingId = await getProjectByGitUrl(projectDetails.git_url, outputChannel);
        if (existingId) {
            outputChannel.appendLine(`Found existing project by git_url with ID: ${existingId}. Initialization complete.`);
            setProjectId(context, existingId);
            return; // Explicitly exit after success
        }
    }
    // 4. If all checks fail, create a new project
    outputChannel.appendLine(`No existing project found on server. Creating a new one.`);
    const existingId = await sendProjectCreationRequest(projectDetails, context, outputChannel);
    if (existingId) {
        setProjectId(context, existingId);
    }
}
async function sendActivityRequest(projectId, seconds, file, outputChannel) {
    try {
        // Get OS information
        const platform = process.platform;
        let os = 'unknown';
        if (platform === 'win32') {
            os = 'windows';
        }
        else if (platform === 'linux') {
            os = 'linux';
        }
        else if (platform === 'darwin') {
            os = 'macos';
        }
        const response = await fetch(`${apiEndpoint}/extensions/activities`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                project_id: projectId,
                seconds: Math.round(seconds),
                file: file,
                editor: "vscode",
                system: os
            })
        });
        outputChannel.appendLine(`[TMETRIX API] Activity request for ${file} status: ${response.status}`);
    }
    catch (e) {
        outputChannel.appendLine(`[TMETRIX API] Problem with activity request: ${e.message}`);
    }
}
async function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("TMetrix");
    outputChannel.appendLine('TMetrix extension is now active!');
    // Register command to set API key BEFORE checking if key exists
    // This allows users to set the key even if it's not set yet
    const setApiKeyCommand = vscode.commands.registerCommand('tmetrix.setApiKey', async () => {
        const inputKey = await vscode.window.showInputBox({
            prompt: 'Enter your TMetrix API Key',
            password: true,
            placeHolder: 'API Key',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API Key cannot be empty';
                }
                return null;
            }
        });
        if (inputKey) {
            api_key = inputKey.trim();
            await context.globalState.update(API_KEY_STORAGE_KEY, api_key);
            vscode.window.showInformationMessage('TMetrix: API Key has been saved successfully! Please reload the window to activate tracking.');
            // Offer to reload the window
            const reload = await vscode.window.showInformationMessage('Reload window to start tracking?', 'Reload', 'Later');
            if (reload === 'Reload') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
    });
    context.subscriptions.push(setApiKeyCommand);
    const key = await getApiKey(context);
    if (!key) {
        vscode.window.showErrorMessage('TMetrix: API Key is required. Please run "TMetrix: Set API Key" command.');
        return;
    }
    outputChannel.appendLine('TMetrix: API Key loaded successfully');
    await initializeProject(context, outputChannel);
    const inactivityThreshold = (vsconfig.get('inactivityThreshold') || 5) * 1000; // Convert to milliseconds
    const loggingInterval = (vsconfig.get('loggingInterval') || 60) * 1000; // Convert to milliseconds
    let lastActivityTimestamp = Date.now();
    let isActive = false;
    let secondsSinceLastLog = 0; // Counter for periodic logging
    // Track activity seconds for all activity types
    let activitySeconds = {
        coding: 0,
        selection: 0,
        navigation: 0,
        debugSession: 0,
        terminal: 0
    };
    let lastGeneralActivityTime = Date.now();
    let timer = null;
    let activityTimer = null; // Timer for general activities
    let currentFile = vscode.window.activeTextEditor?.document.fileName ?? null;
    // Log activity time for all activities
    const logActivityTime = async () => {
        if (!project_uuid) {
            return;
        }
        // Send coding activity
        if (activitySeconds.coding > 0 && currentFile) {
            outputChannel.appendLine(`[TMETRIX] Logging ${activitySeconds.coding} seconds of coding activity`);
            sendActivityRequest(project_uuid, activitySeconds.coding, currentFile, outputChannel);
            activitySeconds.coding = 0;
        }
        // Send selection activity
        if (activitySeconds.selection > 0 && currentFile) {
            outputChannel.appendLine(`[TMETRIX] Logging ${activitySeconds.selection} seconds of selection activity`);
            sendActivityRequest(project_uuid, activitySeconds.selection, currentFile, outputChannel);
            activitySeconds.selection = 0;
        }
        // Send navigation activity
        if (activitySeconds.navigation > 0 && currentFile) {
            outputChannel.appendLine(`[TMETRIX] Logging ${activitySeconds.navigation} seconds of navigation activity`);
            sendActivityRequest(project_uuid, activitySeconds.navigation, currentFile, outputChannel);
            activitySeconds.navigation = 0;
        }
        // Send debug activity
        if (activitySeconds.debugSession > 0 && currentFile) {
            outputChannel.appendLine(`[TMETRIX] Logging ${activitySeconds.debugSession} seconds of debug activity`);
            sendActivityRequest(project_uuid, activitySeconds.debugSession, currentFile, outputChannel);
            activitySeconds.debugSession = 0;
        }
        // Send terminal activity
        if (activitySeconds.terminal > 0) {
            outputChannel.appendLine(`[TMETRIX] Logging ${activitySeconds.terminal} seconds of terminal activity`);
            sendActivityRequest(project_uuid, activitySeconds.terminal, currentFile || 'terminal', outputChannel);
            activitySeconds.terminal = 0;
        }
    };
    const stopActivityTimer = () => {
        // Stop coding timer
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        // Stop general activity timer
        if (activityTimer) {
            clearInterval(activityTimer);
            activityTimer = null;
        }
        // Log all accumulated time
        logActivityTime();
        isActive = false;
        secondsSinceLastLog = 0; // Reset counter
    };
    // Track which activities are currently active
    let activeActivities = {
        coding: false,
        selection: false,
        navigation: false,
        debugSession: false,
        terminal: false
    };
    const startActivityTimer = () => {
        lastGeneralActivityTime = Date.now();
        if (!activityTimer) {
            activityTimer = setInterval(() => {
                const now = Date.now();
                // If no activity for more than inactivity threshold, stop counting
                if (now - lastGeneralActivityTime > inactivityThreshold) {
                    outputChannel.appendLine(`[TMETRIX] General activity inactivity detected, stopping activity timer.`);
                    stopActivityTimer();
                    // Reset all active flags
                    activeActivities = {
                        coding: false,
                        selection: false,
                        navigation: false,
                        debugSession: false,
                        terminal: false
                    };
                }
                else {
                    // Increment counters for all active activities
                    if (activeActivities.coding) {
                        activitySeconds.coding++;
                    }
                    if (activeActivities.selection) {
                        activitySeconds.selection++;
                    }
                    if (activeActivities.navigation) {
                        activitySeconds.navigation++;
                    }
                    if (activeActivities.debugSession) {
                        activitySeconds.debugSession++;
                    }
                    if (activeActivities.terminal) {
                        activitySeconds.terminal++;
                    }
                }
            }, 1000);
            // Set up periodic logging for activities
            setInterval(() => {
                logActivityTime();
            }, loggingInterval);
        }
    };
    const startTimer = () => {
        isActive = true;
        lastActivityTimestamp = Date.now();
        if (!timer) {
            timer = setInterval(() => {
                const now = Date.now();
                if (now - lastActivityTimestamp > inactivityThreshold) {
                    // Inactivity detected, stop the timer and log the time.
                    outputChannel.appendLine(`[TMETRIX] Inactivity detected, stopping timer.`);
                    stopActivityTimer();
                }
                else if (isActive) {
                    // Only increment if user is actively coding
                    activitySeconds.coding++;
                    secondsSinceLastLog++;
                    // Periodic logging check
                    if (secondsSinceLastLog >= loggingInterval / 1000) {
                        logActivityTime();
                        secondsSinceLastLog = 0;
                    }
                }
            }, 1000);
        }
    };
    // Listener for actual typing - this is the only event that should start the timer.
    const onDidChangeTextDocument = (e) => {
        // Only track typing in text editor documents (not in output panels, etc.)
        if (e.document.uri.scheme === 'file') {
            currentFile = e.document.fileName;
            lastActivityTimestamp = Date.now();
            if (!isActive) {
                outputChannel.appendLine(`[TMETRIX] Activity detected in ${currentFile}, starting timer.`);
                startTimer();
            }
        }
    };
    // Listener for switching files
    const onDidChangeActiveTextEditor = (editor) => {
        const previousFile = currentFile;
        // If we're tracking time, log it for the previous file and stop the timer
        if (isActive) {
            outputChannel.appendLine(`[TMETRIX] Editor changed, logging time for previous file.`);
            stopActivityTimer();
        }
        // Update the current file for the next tracking session.
        currentFile = editor?.document.fileName ?? null;
        // Track file switch activity
        if (project_uuid && currentFile && previousFile !== currentFile) {
            outputChannel.appendLine(`[TMETRIX] File switched from ${previousFile} to ${currentFile}`);
        }
        // Don't start the timer here - only actual typing should start the timer
    };
    // Listener for file open
    const onDidOpenTextDocument = (document) => {
        if (document.uri.scheme === 'file') {
            outputChannel.appendLine(`[TMETRIX] File opened: ${document.fileName} (${document.languageId}, ${document.lineCount} lines) - Project UUID: ${project_uuid || 'not set'}`);
        }
    };
    // Listener for file close
    const onDidCloseTextDocument = (document) => {
        if (document.uri.scheme === 'file') {
            outputChannel.appendLine(`[TMETRIX] File closed: ${document.fileName} - Project UUID: ${project_uuid || 'not set'}`);
        }
    };
    // Listener for text selection changes (throttled to avoid too many events)
    let lastSelectionTime = 0;
    const selectionThrottle = 2000; // Only log selections every 2 seconds
    const onDidChangeTextEditorSelection = (e) => {
        const now = Date.now();
        if (e.textEditor.document.uri.scheme === 'file') {
            const selection = e.selections[0];
            if (!selection.isEmpty && now - lastSelectionTime > selectionThrottle) {
                lastSelectionTime = now;
                const selectedText = e.textEditor.document.getText(selection);
                outputChannel.appendLine(`[TMETRIX] Text selection in ${e.textEditor.document.fileName}: ${selectedText.length} chars, lines ${selection.start.line}-${selection.end.line}`);
                // Start tracking selection activity time
                if (!activeActivities.selection) {
                    activeActivities.selection = true;
                    startActivityTimer();
                }
                lastGeneralActivityTime = Date.now();
            }
        }
    };
    // Listener for debug session start
    const onDidStartDebugSession = (session) => {
        const file = vscode.window.activeTextEditor?.document.fileName ?? 'N/A';
        outputChannel.appendLine(`[TMETRIX] Debug session started: ${session.name} (${session.type}) in ${file}`);
        // Start tracking debug activity time
        if (!activeActivities.debugSession) {
            activeActivities.debugSession = true;
            startActivityTimer();
        }
        lastGeneralActivityTime = Date.now();
    };
    // Listener for debug session stop
    const onDidTerminateDebugSession = (session) => {
        const file = vscode.window.activeTextEditor?.document.fileName ?? 'N/A';
        outputChannel.appendLine(`[TMETRIX] Debug session stopped: ${session.name} (${session.type})`);
        // Stop tracking debug activity
        activeActivities.debugSession = false;
    };
    // Listener for terminal open
    const onDidOpenTerminal = (terminal) => {
        outputChannel.appendLine(`[TMETRIX] Terminal opened: ${terminal.name}`);
        // Start tracking terminal activity
        if (!activeActivities.terminal) {
            activeActivities.terminal = true;
            startActivityTimer();
        }
        lastGeneralActivityTime = Date.now();
    };
    // Listener for terminal close
    const onDidCloseTerminal = (terminal) => {
        outputChannel.appendLine(`[TMETRIX] Terminal closed: ${terminal.name}`);
        // Check if there are any remaining terminals
        if (vscode.window.terminals.length === 0) {
            activeActivities.terminal = false;
        }
    };
    // Track terminal state changes (e.g., when terminal becomes active)
    let lastTerminalStateTime = 0;
    const terminalStateThrottle = 3000; // Only log state changes every 3 seconds
    const onDidChangeTerminalState = (terminal) => {
        const now = Date.now();
        if (now - lastTerminalStateTime > terminalStateThrottle) {
            lastTerminalStateTime = now;
            outputChannel.appendLine(`[TMETRIX] Terminal state changed: ${terminal.name}, exit status: ${terminal.exitStatus?.code ?? 'running'}`);
            // Update activity timestamp
            if (activeActivities.terminal) {
                lastGeneralActivityTime = Date.now();
            }
        }
    };
    // Track navigation through code (scrolling, viewport changes)
    let lastNavigationTime = 0;
    const navigationThrottle = 3000; // Only log navigation every 3 seconds
    const onDidChangeTextEditorVisibleRanges = (e) => {
        const now = Date.now();
        if (e.textEditor.document.uri.scheme === 'file' && now - lastNavigationTime > navigationThrottle) {
            lastNavigationTime = now;
            const visibleRange = e.visibleRanges[0];
            outputChannel.appendLine(`[TMETRIX] Navigation in ${e.textEditor.document.fileName}: viewing lines ${visibleRange.start.line}-${visibleRange.end.line} of ${e.textEditor.document.lineCount}`);
            // Start tracking navigation activity time
            if (!activeActivities.navigation) {
                activeActivities.navigation = true;
                startActivityTimer();
            }
            lastGeneralActivityTime = Date.now();
        }
    };
    // Listener for window focus changes
    const onDidChangeWindowState = (e) => {
        if (e.focused) {
            // When window is re-focused, don't start the timer
            // The timer will only start again upon the next typing event
            outputChannel.appendLine(`[TMETRIX] Window focused. Waiting for typing act.`);
        }
        else {
            // When window loses focus, log time and stop the timer if active
            if (isActive) {
                outputChannel.appendLine(`[TMETRIX] Window lost focus, logging time.`);
                stopActivityTimer();
            }
        }
    };
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor));
    context.subscriptions.push(vscode.window.onDidChangeWindowState(onDidChangeWindowState));
    // Register new activity tracking listeners
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(onDidOpenTextDocument));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(onDidCloseTextDocument));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection));
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(onDidStartDebugSession));
    context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(onDidTerminateDebugSession));
    context.subscriptions.push(vscode.window.onDidOpenTerminal(onDidOpenTerminal));
    context.subscriptions.push(vscode.window.onDidCloseTerminal(onDidCloseTerminal));
    context.subscriptions.push(vscode.window.onDidChangeTerminalState(onDidChangeTerminalState));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(onDidChangeTextEditorVisibleRanges));
    outputChannel.appendLine('[TMETRIX] All activity listeners registered successfully');
    outputChannel.appendLine('[TMETRIX] Tracking: file open/close, text selection, debug sessions, terminal activity, navigation');
    context.subscriptions.push({
        dispose: () => {
            stopActivityTimer();
            outputChannel.dispose();
        }
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map