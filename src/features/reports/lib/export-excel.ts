import ExcelJS from "exceljs";
import { BUSINESS, addressLine, gstinLine } from "@/lib/domain/business";

/**
 * Export a report as a styled spreadsheet carrying the same letterhead as the
 * PDF: registered name, address and GSTIN, then the report title and when it
 * was generated. Header row is frozen so long reports stay readable.
 */
export async function exportToExcel(
  title: string,
  headers: string[],
  data: Array<Record<string, any>>,
  fields: string[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = BUSINESS.legalName;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title.slice(0, 31));
  worksheet.views = [{ showGridLines: false }];

  // ---- letterhead ----
  const nameRow = worksheet.addRow([BUSINESS.legalName]);
  nameRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };

  const natureRow = worksheet.addRow([BUSINESS.nature]);
  natureRow.font = { name: "Arial", size: 9, color: { argb: "FF6E7681" } };

  const addressRow = worksheet.addRow([addressLine()]);
  addressRow.font = { name: "Arial", size: 9, color: { argb: "FF6E7681" } };

  const gstRow = worksheet.addRow([gstinLine()]);
  gstRow.font = { name: "Arial", size: 9, color: { argb: "FF6E7681" } };

  worksheet.addRow([]);

  const generated = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const reportRow = worksheet.addRow([
    toTitleCase(title),
    `Generated ${generated}`,
    `${data.length} record${data.length === 1 ? "" : "s"}`,
  ]);
  reportRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
  reportRow.getCell(2).font = { name: "Arial", size: 9, color: { argb: "FF6E7681" } };
  reportRow.getCell(3).font = { name: "Arial", size: 9, color: { argb: "FF6E7681" } };

  worksheet.addRow([]);

  // ---- table ----
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  // Keep the column headings visible when scrolling a long report.
  worksheet.views = [
    { state: "frozen", ySplit: headerRow.number, showGridLines: false },
  ];

  // Data Rows
  data.forEach((row) => {
    const vals = fields.map((f) => {
      const val = row[f];
      if (val === null || val === undefined) return "-";
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

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
