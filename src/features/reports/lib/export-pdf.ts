import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { BUSINESS, addressLine, gstinLine } from "@/lib/domain/business";

/**
 * Export a report as a PDF on a proper letterhead.
 *
 * These files leave the building, clients, suppliers and auditors read them -
 * so each page carries the registered business name, address and GSTIN, and
 * the footer numbers the pages so a printed set can be checked for
 * completeness.
 */

/* Brand colours, as RGB triples for jsPDF. */
const INK = [15, 23, 42] as const; // slate-900, header rows and headings
const ACCENT = [245, 125, 20] as const; // workshop orange, the letterhead rule
const MUTED = [110, 118, 129] as const;

const MARGIN = 14;

export function exportToPDF(
  title: string,
  headers: string[],
  data: Array<Record<string, any>>,
  fields: string[],
) {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightEdge = pageWidth - MARGIN;

  // ---- letterhead ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(BUSINESS.legalName, MARGIN, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(BUSINESS.nature, MARGIN, 21);
  doc.text(addressLine(), MARGIN, 25.5);
  doc.text(gstinLine(), MARGIN, 30);

  // Report metadata, right-aligned against the letterhead.
  const generated = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(toTitleCase(title), rightEdge, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`Generated ${generated}`, rightEdge, 21, { align: "right" });
  doc.text(`${data.length} record${data.length === 1 ? "" : "s"}`, rightEdge, 25.5, {
    align: "right",
  });

  // Accent rule closing the letterhead.
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 34, rightEdge, 34);

  // ---- table ----
  const tableRows = data.map((row) =>
    fields.map((f) => {
      const val = row[f];
      if (val === null || val === undefined || val === "") return "-";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    }),
  );

  doc.autoTable({
    startY: 39,
    head: [headers],
    body: tableRows,
    theme: "grid",
    // Was `fillHexColor`, which autoTable ignores, the styled header never
    // actually rendered. The correct key is `fillColor`.
    headStyles: {
      fillColor: [...INK],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: { fontSize: 8, textColor: [...INK] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: {
      font: "helvetica",
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: "linebreak",
    },
    margin: { left: MARGIN, right: MARGIN, bottom: 18 },

    // Footer on every page: attribution left, page number right.
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      const page = doc.internal.getCurrentPageInfo().pageNumber;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, pageHeight - 12, rightEdge, pageHeight - 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(
        `${BUSINESS.name} · Computer-generated report`,
        MARGIN,
        pageHeight - 8,
      );
      doc.text(`Page ${page}`, rightEdge, pageHeight - 8, { align: "right" });
    },
  });

  doc.save(`${slug(title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
