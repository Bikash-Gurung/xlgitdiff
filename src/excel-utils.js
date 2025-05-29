const vscode = require("vscode");
const xlsx = require("xlsx");
const path = require("path");
const simpleGit = require("simple-git");

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

async function readCurrentExcelData(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const result = {};

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, {
        blankrows: false,
        range: 0,
      });

      const transformedJson = json.map((row, rowIndex) => {
        const data = [];
        let colIndex = 1;

        Object.entries(row).forEach(([key, value]) => {
          data.push({
            col: colIndex,
            [key]: value,
          });
          colIndex++;
        });

        return {
          row: rowIndex + 2,
          data: data,
        };
      });

      result[sheetName] = transformedJson;
    });

    return result;
  } catch (err) {
    console.error("Error reading current Excel as JSON:", err);
    return null;
  }
}

async function readCommittedExcelData(filePath) {
  try {
    const fileDir = path.dirname(filePath);
    const tempGit = simpleGit(fileDir);

    const repoRoot = await tempGit.revparse(["--show-toplevel"]);
    const git = simpleGit(repoRoot);

    const relativePath = path.relative(repoRoot, filePath);

    const tracked = await git
      .raw(["ls-files", "--error-unmatch", relativePath])
      .catch(() => null);
    if (!tracked) throw new Error("File is not committed in Git");

    const lsTree = await git.raw(["ls-tree", "HEAD", "--", relativePath]);
    let gitPath;
    if (lsTree.trim()) {
      const parts = lsTree.trim().split(/\s+/);
      gitPath = parts[3];
    }
    const buffer = await git.binaryCatFile(["blob", `HEAD:${gitPath}`]);

    if (!Buffer.isBuffer(buffer))
      throw new Error("Failed to get binary content");

    const workbook = xlsx.read(buffer, { type: "buffer" });
    const result = {};

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, {
        blankrows: false,
        range: 0,
      });

      const transformedJson = json.map((row, rowIndex) => {
        const data = [];
        let colIndex = 1;

        Object.entries(row).forEach(([key, value]) => {
          data.push({
            col: colIndex,
            [key]: value,
          });
          colIndex++;
        });

        return {
          row: rowIndex + 2,
          data: data,
        };
      });

      result[sheetName] = transformedJson;
    }

    return result;
  } catch (err) {
    console.error("Error reading committed Excel:", err.message);
    return null;
  }
}

module.exports = {
  getCurrentExcelFilePath,
  readCurrentExcelData,
  readCommittedExcelData,
};
