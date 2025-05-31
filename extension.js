const vscode = require("vscode");
const excelUtils = require("./src/excel-utils");
const diffEngine = require("./src/diff-engine");
const { getWebviewContent } = require("./src/view-engine");

const { RUNNING_COMMAND, VIEW_OPTION_COMMAND, VIEW_OPTION_DISPLAY_NAME } = require('./src/constants');

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    RUNNING_COMMAND,
    async () => {
      const excelFilePath = excelUtils.getCurrentExcelFilePath();
      await renderExcelViews(excelFilePath, context);
    }
  );

  // register excel viewer
  const provider = getProvider(context);
  registerExcelAsViewOption(context, provider);

  context.subscriptions.push(disposable);
}

function getProvider(context) {
  const provider = {
          async openCustomDocument(uri, openContext, token) {
            return { uri, dispose: () => {} }; // No editing support, just view
          },
          async resolveCustomEditor(document, webviewPanel, token) {
              webviewPanel.webview.options = {
              enableScripts: true,
          };
          const excelFilePath = document.uri.fsPath;
          await renderExcelViews(excelFilePath, context);
      }
  }
  return provider;
}

async function renderExcelViews(excelFilePath, context) {
    if (!excelFilePath) {
        vscode.window.showWarningMessage("Excel file might not have been selected.");
        return;
    }
    const currentJson = await excelUtils.readCurrentExcelData(excelFilePath);
    const committedJson = await excelUtils.readCommittedExcelData(excelFilePath);

    if (!currentJson) {
        vscode.window.showErrorMessage("Failed to read the current Excel data.");
        return;
    }
    if (!committedJson) {
        return;
    }
    const differences = diffEngine.compareExcelJson(currentJson, committedJson);
    const summary = diffEngine.getDifferencesSummary(differences);

    const panel = vscode.window.createWebviewPanel(
      VIEW_OPTION_COMMAND,
      VIEW_OPTION_DISPLAY_NAME,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    
    panel.webview.html = getWebviewContent(
      currentJson,
      committedJson,
      differences,
      excelFilePath,
      panel.webview,
      context.extensionUri
    );
}

registerExcelAsViewOption = (context, provider) => {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      VIEW_OPTION_COMMAND,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
}

function deactivate() {
  // Cleanup work.
}

module.exports = {
  activate,
  deactivate,
};
