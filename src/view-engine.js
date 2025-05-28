const { getDifferencesSummary } = require("./diff-engine");

function getWebviewContent(currentData, committedData, differences, filePath) {
  // Get all sheet names
  const allSheets = [
    ...new Set([
      ...Object.keys(currentData || {}),
      ...Object.keys(committedData || {}),
    ]),
  ];

  const removedSheets = [];
  Object.keys(differences).forEach((key) => {
    differences[key].forEach((diff) => {
      if (diff.type === "SHEET_REMOVED") {
        removedSheets.push(key);
      }
    });
  });

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Excel Diff Viewer</title>
      <style>
          * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
          }
  
          body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: var(--vscode-editor-background);
              color: var(--vscode-editor-foreground);
              padding: 20px;
          }
  
          .header {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid var(--vscode-panel-border);
          }
  
          .file-path {
              font-size: 14px;
              color: var(--vscode-descriptionForeground);
              margin-bottom: 10px;
          }
  
          .summary {
              display: flex;
              gap: 20px;
              flex-wrap: wrap;
          }
  
          .summary-item {
              background: var(--vscode-badge-background);
              color: var(--vscode-badge-foreground);
              padding: 5px 10px;
              border-radius: 4px;
              font-size: 12px;
          }
  
          .tabs {
              display: flex;
              border-bottom: 1px solid var(--vscode-panel-border);
              margin-bottom: 20px;
              overflow-x: auto;
          }
  
          .tab {
              padding: 10px 20px;
              cursor: pointer;
              border: none;
              background: transparent;
              color: var(--vscode-tab-inactiveForeground);
              border-bottom: 2px solid transparent;
              white-space: nowrap;
              font-size: 14px;
          }
  
          .tab:hover {
              background: var(--vscode-tab-hoverBackground);
          }
  
          .tab.active {
              color: var(--vscode-tab-activeForeground);
              border-bottom-color: var(--vscode-tab-activeBorder);
              background: var(--vscode-tab-activeBackground);
          }
  
          .sheet-content {
              display: none;
          }
  
          .sheet-content.active {
              display: block;
          }
  
          .table-container {
              overflow: auto;
              max-height: 70vh;
              border: 1px solid var(--vscode-panel-border);
              border-radius: 4px;
          }
  
          table {
              width: 100%;
              border-collapse: collapse;
              background: var(--vscode-editor-background);
          }
  
          th, td {
              border: 1px solid var(--vscode-panel-border);
              padding: 8px 12px;
              text-align: left;
              white-space: nowrap;
              min-width: 100px;
          }
  
          th {
              background: var(--vscode-list-hoverBackground);
              font-weight: 600;
              position: sticky;
              top: 0;
              z-index: 10;
          }
  
          .row-header {
              background: var(--vscode-list-hoverBackground);
              font-weight: 600;
              text-align: center;
              min-width: 60px;
              position: sticky;
              left: 0;
              z-index: 5;
          }
  
          /* Difference highlighting */
          .added {
              background-color: rgba(46, 160, 67, 0.2) !important;
              border-left: 3px solid #2ea043;
          }
  
          .removed {
              background-color: rgba(248, 81, 73, 0.2) !important;
              border-left: 3px solid #f85149;
          }
  
          .modified {
              background-color: rgba(251, 188, 5, 0.2) !important;
              border-left: 3px solid #fbbc05;
          }
  
          .cell-tooltip {
              position: relative;
              cursor: help;
          }
  
          .cell-tooltip:hover::after {
              content: attr(data-tooltip);
              position: absolute;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%);
              background: var(--vscode-editorHoverWidget-background);
              color: var(--vscode-editorHoverWidget-foreground);
              padding: 8px;
              border-radius: 4px;
              white-space: pre-line;
              z-index: 1000;
              border: 1px solid var(--vscode-editorHoverWidget-border);
              font-size: 12px;
              max-width: 200px;
          }
  
          .legend {
              display: flex;
              gap: 15px;
              margin-bottom: 15px;
              flex-wrap: wrap;
          }
  
          .legend-item {
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 12px;
          }
  
          .legend-color {
              width: 16px;
              height: 16px;
              border-radius: 2px;
              border-left: 3px solid;
          }
  
          .legend-added { background-color: rgba(46, 160, 67, 0.2); border-left-color: #2ea043; }
          .legend-removed { background-color: rgba(248, 81, 73, 0.2); border-left-color: #f85149; }
          .legend-modified { background-color: rgba(251, 188, 5, 0.2); border-left-color: #fbbc05; }
  
          .no-data {
              text-align: center;
              padding: 40px;
              color: var(--vscode-descriptionForeground);
          }
  
          .version-toggle {
              margin-bottom: 15px;
          }
  
          .version-btn {
              background: var(--vscode-button-secondaryBackground);
              color: var(--vscode-button-secondaryForeground);
              border: none;
              padding: 6px 12px;
              margin-right: 10px;
              cursor: pointer;
              border-radius: 4px;
              font-size: 12px;
          }
  
          .version-btn.active {
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
          }
  
          .version-btn:hover {
              background: var(--vscode-button-hoverBackground);
          }
      </style>
  </head>
  <body>
      <div class="header">
          <div class="file-path">File: ${filePath}</div>
          <div class="summary">
              <div class="summary-item">Sheets: ${allSheets.length}</div>
              <div class="summary-item">Total Changes: ${
                getDifferencesSummary(differences).totalDifferences
              }</div>
          </div>
      </div>
  
      <div class="legend">
          <div class="legend-item">
              <div class="legend-color legend-added"></div>
              <span>Added</span>
          </div>
          <div class="legend-item">
              <div class="legend-color legend-modified"></div>
              <span>Modified</span>
          </div>
          <div class="legend-item">
              <div class="legend-color legend-removed"></div>
              <span>Removed</span>
          </div>
      </div>
  
      <div class="version-toggle">
          <button class="version-btn active" onclick="toggleVersion('current')">Current Version</button>
          <button class="version-btn" onclick="toggleVersion('committed')">Committed Version</button>
          <button class="version-btn" onclick="toggleVersion('diff')">Diff View</button>
      </div>
  
      <div class="tabs">
          ${allSheets
            .map((sheet, index) => {
              // if (!removedSheets.includes(sheet)) {
              //   `<button class="tab ${
              //     index === 0 ? "active" : ""
              //   }" onclick="switchTab('${sheet}')">${sheet}</button>`;
              // }
              `<button class="tab ${
                index === 0 ? "active" : ""
              }" onclick="switchTab('${sheet}')">${sheet}</button>`;
            })
            .join("")}
      </div>
  
      ${allSheets
        .map((sheetName, index) => {
          const currentSheet = currentData?.[sheetName] || [];
          const committedSheet = committedData?.[sheetName] || [];
          const sheetDiffs = differences[sheetName] || [];

          return `
          <div id="${sheetName}" class="sheet-content ${
            index === 0 ? "active" : ""
          }">
              ${generateSheetTable(
                sheetName,
                currentSheet,
                committedSheet,
                sheetDiffs
              )}
          </div>
          `;
        })
        .join("")}
  
      <script>
          let currentView = 'current';
          
          function switchTab(sheetName) {
              // Hide all sheets
              document.querySelectorAll('.sheet-content').forEach(sheet => {
                  sheet.classList.remove('active');
              });
              
              // Remove active from all tabs
              document.querySelectorAll('.tab').forEach(tab => {
                  tab.classList.remove('active');
              });
              
              // Show selected sheet
              document.getElementById(sheetName).classList.add('active');
              
              // Mark tab as active
              event.target.classList.add('active');
          }
          
          function toggleVersion(version) {
              currentView = version;
              
              // Update button states
              document.querySelectorAll('.version-btn').forEach(btn => {
                  btn.classList.remove('active');
              });
              event.target.classList.add('active');
              
              // Update table display
              updateTableDisplay();
          }
          
          function updateTableDisplay() {
              const tables = document.querySelectorAll('table');
              tables.forEach(table => {
                  const rows = table.querySelectorAll('tbody tr');
                  rows.forEach(row => {
                      const cells = row.querySelectorAll('td:not(.row-header)');
                      cells.forEach(cell => {
                          const currentValue = cell.getAttribute('data-current');
                          const committedValue = cell.getAttribute('data-committed');
                          const changeType = cell.getAttribute('data-change');
                          
                          if (currentView === 'current') {
                              cell.textContent = currentValue || '';
                              cell.className = '';
                          } else if (currentView === 'committed') {
                              cell.textContent = committedValue || '';
                              cell.className = '';
                          } else { // diff view
                              cell.textContent = currentValue || '';
                              cell.className = changeType || '';
                          }
                      });
                  });
              });
          }
          
          // Initialize with current view
          updateTableDisplay();
      </script>
  </body>
  </html>`;
}

function generateSheetTable(
  sheetName,
  currentSheet,
  committedSheet,
  sheetDiffs
) {
  if (!currentSheet.length && !committedSheet.length) {
    return '<div class="no-data">No data available for this sheet</div>';
  }

  // Get all columns from both versions
  const allColumns = new Set();
  const allRows = new Set();

  [...currentSheet, ...committedSheet].forEach((rowObj) => {
    allRows.add(rowObj.row);
    rowObj.data.forEach((colObj) => {
      Object.keys(colObj).forEach((key) => {
        if (key !== "col") {
          allColumns.add(key);
        }
      });
    });
  });

  const columns = Array.from(allColumns);
  const rows = Array.from(allRows).sort((a, b) => a - b);

  // Create difference lookup
  const diffLookup = new Map();
  sheetDiffs.forEach((diff) => {
    const key = `${diff.row}-${diff.col}-${diff.column}`;
    diffLookup.set(key, diff);
  });

  // Generate table
  let tableHTML = `
          <div class="table-container">
              <table>
                  <thead>
                      <tr>
                          <th class="row-header">Row</th>
                          ${columns
                            .map(
                              (col, index) =>
                                `<th>Col ${index + 1}<br/>${col}</th>`
                            )
                            .join("")}
                      </tr>
                  </thead>
                  <tbody>
      `;

  rows.forEach((rowNum) => {
    const currentRow = currentSheet.find((r) => r.row === rowNum);
    const committedRow = committedSheet.find((r) => r.row === rowNum);

    tableHTML += `<tr>
              <td class="row-header">${rowNum}</td>
          `;

    columns.forEach((colName, colIndex) => {
      const colNum = colIndex + 1;

      const currentCell = currentRow?.data.find(
        (c) => c[colName] !== undefined
      );
      const committedCell = committedRow?.data.find(
        (c) => c[colName] !== undefined
      );

      const currentValue = currentCell?.[colName] || "";
      const committedValue = committedCell?.[colName] || "";

      const diffKey = `${rowNum}-${colNum}-${colName}`;
      const diff = diffLookup.get(diffKey);

      let changeType = "";
      let tooltip = "";

      if (diff) {
        switch (diff.type) {
          case "VALUE_CHANGED":
            changeType = "modified";
            tooltip = `Changed:\\nCurrent: ${currentValue}\\nCommitted: ${committedValue}`;
            break;
          case "COLUMN_ADDED":
            changeType = "added";
            tooltip = `Added: ${currentValue}`;
            break;
          case "COLUMN_REMOVED":
            changeType = "removed";
            tooltip = `Removed: ${committedValue}`;
            break;
        }
      }

      tableHTML += `
                  <td class="cell-tooltip" 
                      data-current="${currentValue}" 
                      data-committed="${committedValue}"
                      data-change="${changeType}"
                      ${tooltip ? `data-tooltip="${tooltip}"` : ""}>
                      ${currentValue}
                  </td>
              `;
    });

    tableHTML += "</tr>";
  });

  tableHTML += `
                  </tbody>
              </table>
          </div>
      `;

  return tableHTML;
}

module.exports = { getWebviewContent };
