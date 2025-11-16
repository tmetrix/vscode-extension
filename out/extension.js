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
const apiEndpoint = vsconfig.get('apiEndpoint') || 'http://localhost:9898';
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
    let codingSeconds = 0;
    let lastActivityTimestamp = Date.now();
    let isActive = false;
    let timer = null;
    let loggingTimer = null;
    let currentFile = vscode.window.activeTextEditor?.document.fileName ?? null;
    const logTime = async () => {
        if (codingSeconds > 0 && currentFile) {
            if (project_uuid) {
                outputChannel.appendLine(`[TMETRIX] Logging ${codingSeconds} seconds for ${currentFile}`);
                sendActivityRequest(project_uuid, codingSeconds, currentFile, outputChannel);
            }
            else {
                outputChannel.appendLine(`[TMETRIX] No project UUID, cannot send activity request  for ${currentFile}.`);
            }
            codingSeconds = 0;
        }
    };
    const stopTimer = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
            logTime();
        }
        if (loggingTimer) {
            clearInterval(loggingTimer);
            loggingTimer = null;
        }
        isActive = false;
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
                    stopTimer();
                }
                else if (isActive) {
                    // Only increment if user is actively coding
                    codingSeconds++;
                }
            }, 1000);
            // Set up periodic logging even during active coding sessions
            loggingTimer = setInterval(() => {
                if (codingSeconds > 0) {
                    logTime();
                }
            }, loggingInterval);
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
        // If we're tracking time, log it for the previous file and stop the timer
        if (isActive) {
            outputChannel.appendLine(`[TMETRIX] Editor changed, logging time for previous file.`);
            stopTimer();
        }
        // Update the current file for the next tracking session.
        currentFile = editor?.document.fileName ?? null;
        // Don't start the timer here - only actual typing should start the timer
    };
    // Listener for window focus changes
    const onDidChangeWindowState = (e) => {
        if (e.focused) {
            // When window is re-focused, don't start the timer
            // The timer will only start again upon the next typing event
            outputChannel.appendLine(`[TMETRIX] Window focused. Waiting for typing activity.`);
        }
        else {
            // When window loses focus, log time and stop the timer if active
            if (isActive) {
                outputChannel.appendLine(`[TMETRIX] Window lost focus, logging time.`);
                stopTimer();
            }
        }
    };
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor));
    context.subscriptions.push(vscode.window.onDidChangeWindowState(onDidChangeWindowState));
    context.subscriptions.push({
        dispose: () => {
            stopTimer();
            outputChannel.dispose();
        }
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map