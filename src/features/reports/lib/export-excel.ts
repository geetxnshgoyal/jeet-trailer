import ExcelJS from "exceljs";

export async function exportToExcel(
  title: string,
  headers: string[],
  data: Array<Record<string, any>>,
  fields: string[],
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title.slice(0, 31));

  // Style sheet
  worksheet.views = [{ showGridLines: true }];

  // Title Row
  const titleRow = worksheet.addRow(["JEET TRAILERS - " + title.toUpperCase()]);
  titleRow.font = { name: "Arial", size: 14, bold: true };
  worksheet.addRow([]); // empty spacing

  // Headers Row
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEAB308" }, // Amber primary color
    };
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Data Rows
  data.forEach((row) => {
    const vals = fields.map((f) => {
      const val = row[f];
      if (val === null || val === undefined) return "—";
      return val;
    });
    const addedRow = worksheet.addRow(vals);
    addedRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? String(cell.value).length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.max(maxLength + 3, 10);
  });

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}
