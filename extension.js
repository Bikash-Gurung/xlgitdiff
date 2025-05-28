const vscode = require("vscode");
const excelUtils = require("./src/excel-utils");
const diffEngine = require("./src/diff-engine");
const { getWebviewContent } = require("./src/view-engine");

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    "xldiff.diffxl",
    async () => {
      const excelFilePath = excelUtils.getCurrentExcelFilePath();

      if (excelFilePath) {
        const currentJson = await excelUtils.readCurrentExcelData(
          excelFilePath
        );
        const committedJson = await excelUtils.readCommittedExcelData(
          excelFilePath
        );

        if (!currentJson || !committedJson) {
          vscode.window.showErrorMessage(
            "Failed to read the current or committed Excel data."
          );
          return;
        }

        const differences = diffEngine.compareExcelJson(
          currentJson,
          committedJson
        );
        const summary = diffEngine.getDifferencesSummary(differences);

        console.log("Current Sheet Data:", currentJson);
        console.log("Committed Sheet Data:", committedJson);
        console.log("Comparison Summary:", summary);
        console.log("Differences:", differences);

        const panel = vscode.window.createWebviewPanel(
          "excelDiff",
          "Excel Diff Viewer",
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
          excelFilePath
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
