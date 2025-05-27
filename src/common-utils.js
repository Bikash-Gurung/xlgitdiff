const vscode = require("vscode");

function getCurrentExcelFilePath() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return null;
  }

  const filePath = editor.document.uri.fsPath;

  if (!filePath.endsWith(".xlsx")) {
    vscode.window.showErrorMessage("The active file is not an .xlsx file.");
    return null;
  }

  return filePath;
}

module.exports = { getCurrentExcelFilePath };
