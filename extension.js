const vscode = require("vscode");
const excelUtils = require("./src/excel-utils");
const diffEngine = require("./src/diff-engine");
const { getWebviewContent } = require("./src/view-engine");

const path = require("node:path");

const { RUNNING_COMMAND, VIEW_OPTION_COMMAND, VIEW_OPTION_DISPLAY_NAME, 
        UPLOAD_AND_COMPARE_EXCEL_FILES, UPLOAD_AND_COMPARE_EXCEL_FILES_DISPLAY_NAME,
        SELECT_TWO_EXCEL_FILES_BUTTON_LABEL } = require('./src/constants');

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    RUNNING_COMMAND,
    async () => {
      const excelFilePath = excelUtils.getCurrentExcelFilePath();
      if (!excelFilePath) {
          vscode.window.showWarningMessage("Excel file might not have been selected.");
          return;
      }
      const currentJson = await excelUtils.readCurrentExcelData(excelFilePath);
      const committedJson = await excelUtils.readCommittedExcelData(excelFilePath);
    
      await renderExcelViews(currentJson, committedJson, VIEW_OPTION_COMMAND, VIEW_OPTION_DISPLAY_NAME, `Viewing git diff of file: ${excelFilePath}`, context);
    }
  );

  // register excel viewer
  const provider = getProvider(context);
  registerExcelAsViewOption(context, provider);

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand(UPLOAD_AND_COMPARE_EXCEL_FILES, () => {
        uploadAndCompareExcelFiles(context);
    })
  );
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
          if (!excelFilePath) {
              vscode.window.showWarningMessage("Excel file might not have been selected.");
              return;
          }
          const firstFileJson = await excelUtils.readCurrentExcelData(excelFilePath);
          const secondFileJson = await excelUtils.readCommittedExcelData(excelFilePath);
          await renderExcelViews(firstFileJson, secondFileJson, VIEW_OPTION_COMMAND, VIEW_OPTION_DISPLAY_NAME, `Viewing git diff of file: ${excelFilePath}`, context);
      }
  }
  return provider;
}

async function renderExcelViews(firstJson, secondJson, actionCommand, displayCommand, excelFilePath, context, fileNames = {}) {
    if (!firstJson || !secondJson) {
        vscode.window.showWarningMessage("Read failed, Make sure Excel file is selected or it has commit.");
        return;
    }
    if (!secondJson) {
        return;
    }
    const differences = diffEngine.compareExcelJson(firstJson, secondJson);
    const summary = diffEngine.getDifferencesSummary(differences);

    const panel = vscode.window.createWebviewPanel(
      actionCommand,
      displayCommand,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    
    // Listen for the event sent from the webview.
    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message?.command?.eventType === UPLOAD_AND_COMPARE_EXCEL_FILES) {
            vscode.commands.executeCommand(UPLOAD_AND_COMPARE_EXCEL_FILES);
        }
      },
      undefined,
      context.subscriptions
    );
    panel.webview.html = getWebviewContent(
      firstJson,
      secondJson,
      differences,
      excelFilePath,
      panel.webview,
      context.extensionUri,
      fileNames
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

async function uploadAndCompareExcelFiles(context) {
    const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: true, openLabel: SELECT_TWO_EXCEL_FILES_BUTTON_LABEL,
        filters: { Excel: ['xlsx', 'xls'] }
    });
    if (!fileUris || fileUris.length !== 2) {
        vscode.window.showInformationMessage('Please select exactly two Excel files.');
        return;
    }
    // Store the file paths of the selected Excel files. This will always be of two files.
    const filePaths = [];
    try {
        fileUris.forEach(uri => {
              fileDetails = {}
              fileDetails.filePath = uri.fsPath;
              fileDetails.fileName = path.basename(uri.fsPath);
              filePaths.push(fileDetails);
        });
        // Use readCurrentExcelData method for both as it is manual comparision and there might be no git commit.
        const jsonForFirstFile = await excelUtils.readCurrentExcelData(filePaths[0].filePath);
        const jsonForSecondFile = await excelUtils.readCurrentExcelData(filePaths[1].filePath);
    
        const fileNames = {
            // Indices are reversed to match the order of filePaths
            firstFileName: `File: ${filePaths[1].fileName}`,
            secondFileName: `File: ${filePaths[0].fileName}`
        }
        
        await renderExcelViews(jsonForFirstFile, jsonForSecondFile, UPLOAD_AND_COMPARE_EXCEL_FILES, 
          UPLOAD_AND_COMPARE_EXCEL_FILES_DISPLAY_NAME, 
          `Comparing uploaded excel files: ${filePaths[0].filePath} and ${filePaths[1].filePath}`,
           context, fileNames);
    } 
    catch (err) {
        vscode.window.showErrorMessage('Error comparing Excel files '+ err.message);
    }
}

function deactivate() {
  // Cleanup work.
}

module.exports = {
  activate,
  deactivate,
};
