function compareExcelJson(currentData, committedData) {
  const differences = {};

  // Get all sheet names from both datasets
  const currentSheets = Object.keys(currentData || {});
  const committedSheets = Object.keys(committedData || {});
  const allSheets = [...new Set([...currentSheets, ...committedSheets])];

  allSheets.forEach((sheetName) => {
    const currentSheet = currentData?.[sheetName] || [];
    const committedSheet = committedData?.[sheetName] || [];
    const sheetDifferences = [];

    // Check if sheet exists in both
    if (!currentData?.[sheetName]) {
      sheetDifferences.push({
        type: "SHEET_REMOVED",
        name: sheetName,
        message: `Sheet '${sheetName}' was removed from current file`,
      });
      differences[sheetName] = sheetDifferences;
      return;
    }

    if (!committedData?.[sheetName]) {
      sheetDifferences.push({
        type: "SHEET_ADDED",
        message: `Sheet '${sheetName}' was added to current file`,
      });
      differences[sheetName] = sheetDifferences;
      return;
    }

    // Create maps for easier lookup by row number
    const currentRowMap = new Map();
    const committedRowMap = new Map();

    currentSheet.forEach((rowObj) => {
      currentRowMap.set(rowObj.row, rowObj.data);
    });

    committedSheet.forEach((rowObj) => {
      committedRowMap.set(rowObj.row, rowObj.data);
    });

    // Get all row numbers from both datasets
    const allRows = [
      ...new Set([...currentRowMap.keys(), ...committedRowMap.keys()]),
    ];

    allRows.forEach((rowNum) => {
      const currentRow = currentRowMap.get(rowNum);
      const committedRow = committedRowMap.get(rowNum);

      // Check if row was added or removed
      if (!currentRow) {
        sheetDifferences.push({
          type: "ROW_REMOVED",
          row: rowNum,
          message: `Row ${rowNum} was removed`,
        });
        return;
      }

      if (!committedRow) {
        sheetDifferences.push({
          type: "ROW_ADDED",
          row: rowNum,
          message: `Row ${rowNum} was added`,
          currentData: currentRow,
        });
        return;
      }

      // Compare columns in the row
      const currentColMap = new Map();
      const committedColMap = new Map();

      // Create maps for column data
      currentRow.forEach((colObj) => {
        const colNum = colObj.col;
        const columnData = { ...colObj };
        delete columnData.col; // Remove col property to get actual data
        currentColMap.set(colNum, columnData);
      });

      committedRow.forEach((colObj) => {
        const colNum = colObj.col;
        const columnData = { ...colObj };
        delete columnData.col; // Remove col property to get actual data
        committedColMap.set(colNum, columnData);
      });

      // Get all column numbers from both rows
      const allCols = [
        ...new Set([...currentColMap.keys(), ...committedColMap.keys()]),
      ];

      allCols.forEach((colNum) => {
        const currentCol = currentColMap.get(colNum);
        const committedCol = committedColMap.get(colNum);

        // Check if column was added or removed
        if (!currentCol) {
          sheetDifferences.push({
            type: "COLUMN_REMOVED",
            row: rowNum,
            col: colNum,
            message: `Column ${colNum} in row ${rowNum} was removed`,
            committedData: committedCol,
          });
          return;
        }

        if (!committedCol) {
          sheetDifferences.push({
            type: "COLUMN_ADDED",
            row: rowNum,
            col: colNum,
            message: `Column ${colNum} in row ${rowNum} was added`,
            currentData: currentCol,
          });
          return;
        }

        // Compare column data
        const currentKeys = Object.keys(currentCol);
        const committedKeys = Object.keys(committedCol);
        const allKeys = [...new Set([...currentKeys, ...committedKeys])];

        allKeys.forEach((key) => {
          const currentValue = currentCol[key];
          const committedValue = committedCol[key];

          if (currentValue !== committedValue) {
            sheetDifferences.push({
              type: "VALUE_CHANGED",
              row: rowNum,
              col: colNum,
              column: key,
              message: `Value changed in row ${rowNum}, column ${colNum} (${key})`,
              currentValue: currentValue,
              committedValue: committedValue,
            });
          }
        });
      });
    });

    if (sheetDifferences.length > 0) {
      differences[sheetName] = sheetDifferences;
    }
  });

  return differences;
}

// Helper function to get a summary of differences
function getDifferencesSummary(differences) {
  const summary = {
    totalSheets: Object.keys(differences).length,
    totalDifferences: 0,
    byType: {},
  };

  Object.values(differences).forEach((sheetDiffs) => {
    sheetDiffs.forEach((diff) => {
      summary.totalDifferences++;
      summary.byType[diff.type] = (summary.byType[diff.type] || 0) + 1;
    });
  });

  return summary;
}

// Helper function to format differences for readable output
function formatDifferences(differences) {
  let output = "";

  Object.entries(differences).forEach(([sheetName, sheetDiffs]) => {
    output += `\n=== Sheet: ${sheetName} ===\n`;

    sheetDiffs.forEach((diff) => {
      switch (diff.type) {
        case "SHEET_ADDED":
        case "SHEET_REMOVED":
          output += `${diff.message}\n`;
          break;
        case "ROW_ADDED":
        case "ROW_REMOVED":
          output += `${diff.message}\n`;
          break;
        case "COLUMN_ADDED":
        case "COLUMN_REMOVED":
          output += `${diff.message}\n`;
          break;
        case "VALUE_CHANGED":
          output += `${diff.message}\n`;
          output += `  Current: ${diff.currentValue}\n`;
          output += `  Committed: ${diff.committedValue}\n`;
          break;
      }
    });
  });

  return output;
}

// Main comparison function that uses your Excel reading functions
async function compareExcelFiles(
  filePath,
  readCurrentExcelData,
  readCommittedExcelData
) {
  try {
    const currentData = await readCurrentExcelData(filePath);
    const committedData = await readCommittedExcelData(filePath);

    if (!currentData || !committedData) {
      console.error("Failed to read one or both Excel files");
      return null;
    }

    const differences = compareExcelJson(currentData, committedData);
    const summary = getDifferencesSummary(differences);

    console.log("Comparison Summary:", summary);

    if (summary.totalDifferences > 0) {
      console.log("\nDetailed Differences:");
      console.log(formatDifferences(differences));
    } else {
      console.log(
        "No differences found between current and committed versions."
      );
    }

    return { differences, summary };
  } catch (error) {
    console.error("Error comparing Excel files:", error);
    return null;
  }
}

module.exports = {
  compareExcelJson,
  getDifferencesSummary,
  formatDifferences,
  compareExcelFiles,
};
