import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface ExportField {
  header: string;
  dataKey: string;
}

export function exportToPDF(
  title: string,
  headers: string[],
  data: Array<Record<string, any>>,
  fields: string[],
) {
  const doc = new jsPDF() as any;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("JEET TRAILERS", 14, 15);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`${title}`, 14, 21);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);

  // Divider
  doc.setDrawColor(200);
  doc.line(14, 31, 196, 31);

  // Prepare table data
  const tableRows = data.map((row) =>
    fields.map((f) => {
      const val = row[f];
      if (val === null || val === undefined) return "—";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    })
  );

  // Create table
  doc.autoTable({
    startY: 35,
    head: [headers],
    body: tableRows,
    theme: "striped",
    headStyles: { fillHexColor: "#eab308", textColor: "#ffffff", fontStyle: "bold" }, // Amber primary header
    styles: { fontSize: 8, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: "auto" },
    },
  });

  // Save PDF
  doc.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0,10)}.pdf`);
}
