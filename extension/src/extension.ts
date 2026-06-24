import * as vscode from 'vscode';
import axios from 'axios';

let diagnosticCollection: vscode.DiagnosticCollection;
let hoverProvider: vscode.Disposable | null = null;
let hoverMessages: Map<string, string> = new Map(); // Key format: filePath:line -> suggestion text

export function activate(context: vscode.ExtensionContext) {
  console.log('ReviewLLM extension is now active.');

  diagnosticCollection = vscode.languages.createDiagnosticCollection('reviewLlm');
  context.subscriptions.push(diagnosticCollection);

  // Command 1: Review current file
  let reviewDisposable = vscode.commands.registerCommand('aiCodeReview.reviewFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found. Open a code file first!');
      return;
    }

    const document = editor.document;
    const sourceCode = document.getText();
    const languageId = document.languageId;
    const filePath = document.uri.fsPath;

    // Map VS Code language IDs to backend names
    let backendLanguage = languageId;
    if (languageId === 'typescript') backendLanguage = 'javascript';
    if (languageId === 'cpp') backendLanguage = 'cpp';

    // Get config values
    const config = vscode.workspace.getConfiguration('reviewLlm');
    const backendUrl = config.get<string>('backendUrl') || 'http://localhost:5000/api';
    const mode = config.get<string>('mode') || 'developer';

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "ReviewLLM: Running static, sandbox, and AI analysis...",
      cancellable: false
    }, async (progress) => {
      try {
        const response = await axios.post(`${backendUrl}/reviews/analyze`, {
          language: backendLanguage,
          sourceCode,
          mode
        });

        const { ruleFeedback, runtimeFeedback, aiFeedback } = response.data;

        // Reset previous markings
        diagnosticCollection.clear();
        hoverMessages.clear();

        const diagnostics: vscode.Diagnostic[] = [];

        // 1. Process Static Rule Warnings
        if (ruleFeedback && Array.isArray(ruleFeedback)) {
          ruleFeedback.forEach((violation: any) => {
            const lineNum = Math.max(0, violation.line - 1);
            const lineText = document.lineAt(lineNum);
            const range = new vscode.Range(lineNum, lineText.firstNonWhitespaceCharacterIndex, lineNum, lineText.text.length);

            const severity = violation.severity === 'error' 
              ? vscode.DiagnosticSeverity.Error 
              : vscode.DiagnosticSeverity.Warning;

            const diag = new vscode.Diagnostic(
              range,
              `[ReviewLLM Rule Engine: ${violation.ruleId}] ${violation.message}`,
              severity
            );
            diag.source = 'ReviewLLM';
            diagnostics.push(diag);

            if (violation.fix) {
              hoverMessages.set(`${filePath}:${lineNum}`, `**Rule Fix:**\n\`\`\`\n${violation.fix}\n\`\`\``);
            }
          });
        }

        // 2. Process Sandbox Runtime Errors
        if (runtimeFeedback && !runtimeFeedback.success) {
          const lineNum = Math.max(0, (runtimeFeedback.line || 1) - 1);
          const lineText = document.lineAt(lineNum);
          const range = new vscode.Range(lineNum, lineText.firstNonWhitespaceCharacterIndex, lineNum, lineText.text.length);

          const diag = new vscode.Diagnostic(
            range,
            `[ReviewLLM Sandbox Error] ${runtimeFeedback.error}`,
            vscode.DiagnosticSeverity.Error
          );
          diag.source = 'ReviewLLM';
          diagnostics.push(diag);

          if (runtimeFeedback.fix) {
            const existingHover = hoverMessages.get(`${filePath}:${lineNum}`) || '';
            hoverMessages.set(
              `${filePath}:${lineNum}`, 
              (existingHover ? existingHover + '\n\n' : '') + `**Sandbox Suggested Fix:**\n${runtimeFeedback.fix}`
            );
          }
        }

        // 3. Process AI Feedback Bugs
        if (aiFeedback && aiFeedback.bug_reports && Array.isArray(aiFeedback.bug_reports)) {
          aiFeedback.bug_reports.forEach((bug: any) => {
            const lineNum = Math.max(0, bug.line - 1);
            const lineText = document.lineAt(lineNum);
            const range = new vscode.Range(lineNum, lineText.firstNonWhitespaceCharacterIndex, lineNum, lineText.text.length);

            const severity = bug.severity === 'error'
              ? vscode.DiagnosticSeverity.Error
              : vscode.DiagnosticSeverity.Warning;

            const diag = new vscode.Diagnostic(
              range,
              `[ReviewLLM AI Recommendation] ${bug.message}`,
              severity
            );
            diag.source = 'ReviewLLM';
            diagnostics.push(diag);

            const existingHover = hoverMessages.get(`${filePath}:${lineNum}`) || '';
            hoverMessages.set(
              `${filePath}:${lineNum}`,
              (existingHover ? existingHover + '\n\n' : '') + `**AI Review Suggestion:**\n${bug.suggestion}`
            );
          });
        }

        diagnosticCollection.set(document.uri, diagnostics);

        // Notify user
        const issuesCount = diagnostics.length;
        if (issuesCount === 0) {
          vscode.window.showInformationMessage('ReviewLLM: No syntax issues, compilation bugs, or coding standards violations found!');
        } else {
          vscode.window.showErrorMessage(`ReviewLLM: Found ${issuesCount} diagnostic warnings. Hover on code lines to inspect fixes.`);
        }

      } catch (err: any) {
        vscode.window.showErrorMessage(`ReviewLLM API Connection failed: ${err.message}`);
      }
    });
  });
  context.subscriptions.push(reviewDisposable);

  // Command 2: Clear diagnostics
  let clearDisposable = vscode.commands.registerCommand('aiCodeReview.clearDiagnostics', () => {
    diagnosticCollection.clear();
    hoverMessages.clear();
    vscode.window.showInformationMessage('ReviewLLM markings cleared.');
  });
  context.subscriptions.push(clearDisposable);

  // Hover Provider Registration
  hoverProvider = vscode.languages.registerHoverProvider('*', {
    provideHover(document, position) {
      const filePath = document.uri.fsPath;
      const key = `${filePath}:${position.line}`;
      const hoverMsg = hoverMessages.get(key);

      if (hoverMsg) {
        const mdString = new vscode.MarkdownString();
        mdString.appendMarkdown(`### ReviewLLM Inspector\n\n`);
        mdString.appendMarkdown(hoverMsg);
        mdString.isTrusted = true;
        return new vscode.Hover(mdString);
      }
      return null;
    }
  });
  context.subscriptions.push(hoverProvider);
}

export function deactivate() {
  if (hoverProvider) {
    hoverProvider.dispose();
  }
}
