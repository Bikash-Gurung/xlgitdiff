function compareExcelJson(currentJson, committedJson) {
  const differences = {};

  const currentSheets = Object.keys(currentJson || {});
  const committedSheets = Object.keys(committedJson || {});
  const allSheets = [...new Set([...currentSheets, ...committedSheets])];

  allSheets.forEach((sheetName) => {
    const currentSheet = currentJson?.[sheetName] || [];
    const committedSheet = committedJson?.[sheetName] || [];
    const sheetDifferences = [];

    if (!currentJson?.[sheetName]) {
      sheetDifferences.push({
        type: "SHEET_REMOVED",
        name: sheetName,
        message: `Sheet '${sheetName}' is removed from current file`,
      });
      differences[sheetName] = sheetDifferences;
      return;
    }

    if (!committedJson?.[sheetName]) {
      sheetDifferences.push({
        type: "SHEET_ADDED",
        message: `Sheet '${sheetName}' is added to current file`,
      });
      differences[sheetName] = sheetDifferences;
      return;
    }

    const currentRowMap = new Map();
    const committedRowMap = new Map();

    currentSheet.forEach((rowObj) => {
      currentRowMap.set(rowObj.row, rowObj.data);
    });

    committedSheet.forEach((rowObj) => {
      committedRowMap.set(rowObj.row, rowObj.data);
    });

    // Get all row numbers from both datasets
    const allRows = [...new Set([...currentRowMap.keys(), ...committedRowMap.keys()])];

    allRows.forEach((rowNum) => {
      const currentRow = currentRowMap.get(rowNum);
      const committedRow = committedRowMap.get(rowNum);

      if (!currentRow) {
        sheetDifferences.push({
          type: "ROW_REMOVED",
          row: rowNum,
          message: `Row ${rowNum} is removed`,
        });
        return;
      }

      if (!committedRow) {
        sheetDifferences.push({
          type: "ROW_ADDED",
          row: rowNum,
          message: `Row ${rowNum} is added`,
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
      const allCols = [...new Set([...currentColMap.keys(), ...committedColMap.keys()])];

      allCols.forEach((colNum) => {
        const currentCol = currentColMap.get(colNum);
        const committedCol = committedColMap.get(colNum);

        // Check if column was added or removed
        if (!currentCol) {
          sheetDifferences.push({
            type: "COLUMN_REMOVED",
            row: rowNum,
            col: colNum,
            message: `Column ${colNum} in row ${rowNum} is removed`,
            committedData: committedCol
          });
          return;
        }

        if (!committedCol) {
          sheetDifferences.push({
            type: "COLUMN_ADDED",
            row: rowNum,
            col: colNum,
            message: `Column ${colNum} in row ${rowNum} is added`,
            currentData: currentCol
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
              committedValue: committedValue
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

module.exports = {
  compareExcelJson,
  getDifferencesSummary,
};
