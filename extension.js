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

      if (excelFilePath) {
        const currentJson = await excelUtils.readCurrentExcelData(
          excelFilePath
        );
        const committedJson = await excelUtils.readCommittedExcelData(
          excelFilePath
        );

        if (!currentJson) {
            vscode.window.showErrorMessage("Failed to read the current Excel data.");
            return;
        }
        if (!committedJson) {
            // vscode.window.showErrorMessage("Failed to read the committed Excel data.");
            return;
        }

        const differences = diffEngine.compareExcelJson(
          currentJson,
          committedJson
        );
        const summary = diffEngine.getDifferencesSummary(differences);

        //console.log("Current Sheet Data:", currentJson);
        //console.log("Committed Sheet Data:", committedJson);
        //console.log("Comparison Summary:", summary);
        //console.log("Differences:", differences);

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
    }
  );

  // register excel viewer
  const provider = getProvider(context);

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
          if (excelFilePath) {
            const currentJson = await excelUtils.readCurrentExcelData(excelFilePath);
            const committedJson = await excelUtils.readCommittedExcelData(excelFilePath);
            if (!currentJson) {
                vscode.window.showErrorMessage("Failed to read the current Excel data.");
                return;
            }
            if (!committedJson) {
                // vscode.window.showErrorMessage("Failed to read the committed Excel data.");
                return;
            }
            const differences = diffEngine.compareExcelJson(currentJson, committedJson);
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
      }
  }
  return provider;
}

function deactivate() {
  // Cleanup work.
}

module.exports = {
  activate,
  deactivate,
};
