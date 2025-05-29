const { getDifferencesSummary } = require("./diff-engine");
const vscode = require('vscode')

function getWebviewContent(currentData, committedData, differences, filePath, webview, extensionUri) {
  // Get all sheet names
  const allSheets = [
    ...new Set([
      ...Object.keys(currentData || {}),
      ...Object.keys(committedData || {}),
    ]),
  ];
  const styleUrl = webview.asWebviewUri(
     vscode.Uri.joinPath(extensionUri, 'media', 'view.css')
  )
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Excel Diff Viewer</title>
      <link rel="stylesheet" href="${styleUrl}">
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
          <button class="version-btn" onclick="toggleVersion('committed')">Previous Version</button>
          <button class="version-btn active" onclick="toggleVersion('current')">Current Version</button>
          <button class="version-btn" onclick="toggleVersion('diff')">Diff View</button>
      </div>

      <div class="tabs">
          ${allSheets
            .map(
              (sheet, index) =>
                `<button class="tab ${
                  index === 0 ? "active" : ""
                }" onclick="switchTab('${sheet}')">${sheet}</button>`
            )
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
                          const currentValue = cell.getAttribute('data-current') || '';
                          const committedValue = cell.getAttribute('data-committed') || '';
                          const changeType = cell.getAttribute('data-change') || '';

                          if (currentView === 'current') {
                              cell.textContent = currentValue;
                              cell.className = 'cell-tooltip';
                              cell.removeAttribute('data-tooltip');
                          } else if (currentView === 'committed') {
                              cell.textContent = committedValue;
                              cell.className = 'cell-tooltip';
                              cell.removeAttribute('data-tooltip');
                          } else { // diff view
                              if (changeType === 'removed') {
                                  cell.textContent = committedValue;
                              } else {
                                  cell.textContent = currentValue;
                              }
                              cell.className = 'cell-tooltip ' + changeType;

                              if (changeType === 'modified') {
                                  cell.setAttribute(
                                    'data-tooltip',
                                    'Previous: ' + committedValue + '\\nCurrent: ' + currentValue
                                  );
                              } else {
                                  cell.removeAttribute('data-tooltip');
                              }
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
  const diffLookup = new Map(); // key: row_col_key, value: type
  sheetDiffs.forEach((diff) => {
    const key = `${diff.row}_${diff.col}_${diff.key}`;
    diffLookup.set(key, diff.type);
  });

  // Build table header with columns
  const headerCols = columns.map((col) => `<th>${col}</th>`).join("");
  // Row header + columns
  let html = `<div class="table-container"><table><thead><tr><th class="row-header">Row</th>${headerCols}</tr></thead><tbody>`;

  for (const rowNum of rows) {
    html += `<tr><td class="row-header">${rowNum}</td>`;

    for (const colName of columns) {
      // Find current value and committed value for this cell & column key
      const currentRow = currentSheet.find((r) => r.row === rowNum);
      const committedRow = committedSheet.find((r) => r.row === rowNum);

      let currentCellObj = null;
      let committedCellObj = null;

      if (currentRow) {
        currentCellObj = currentRow.data.find((c) =>
          Object.keys(c).some((k) => k !== "col" && k === colName)
        );
      }
      if (committedRow) {
        committedCellObj = committedRow.data.find((c) =>
          Object.keys(c).some((k) => k !== "col" && k === colName)
        );
      }

      const currentValue = currentCellObj ? currentCellObj[colName] ?? "" : "";
      const committedValue = committedCellObj
        ? committedCellObj[colName] ?? ""
        : "";

      // Find change type for this cell/key
      const key = `${rowNum}_${
        currentCellObj ? currentCellObj.col : ""
      }_${colName}`;
      let changeType = diffLookup.get(key) || "";

      // Special handling for deleted rows or columns (show committed value as removed)
      if (changeType === "" && committedValue !== "" && currentValue === "") {
        changeType = "removed";
      }

      // For added cells
      if (changeType === "" && currentValue !== "" && committedValue === "") {
        changeType = "added";
      }

      // For modified cells
      if (
        changeType === "" &&
        currentValue !== committedValue &&
        currentValue !== "" &&
        committedValue !== ""
      ) {
        changeType = "modified";
      }

      html += `<td 
                  class="cell-tooltip ${changeType}" 
                  data-current="${escapeHtml(currentValue)}" 
                  data-committed="${escapeHtml(committedValue)}" 
                  data-change="${changeType}"
                ></td>`;
    }

    html += "</tr>";
  }

  html += "</tbody></table></div>";
  return html;
}

function escapeHtml(text) {
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  getWebviewContent,
};
