/**
 * Business identity for Jeet Trailers, as registered under GST.
 *
 * Single source of truth for anything that carries the company's name: the
 * app shell, the login screen, and, most importantly, exported reports,
 * which leave the building and are read by clients, suppliers and auditors.
 */

export const BUSINESS = {
  /** Trading name, as it should appear in headings. */
  name: "Jeet Trailers",
  /** Legal name exactly as registered. Use on formal documents. */
  legalName: "JEET TRAILERS",
  gstin: "08PHGPS8765A1ZM",
  entityType: "Proprietorship",
  /** What the business actually does, used as the brand strapline. */
  nature: "Trailer Manufacturing & Workshop",

  /**
   * A readable postal address for letterheads. The full GST record is a land
   * description (khata and kila numbers) that is unusable as a header, so the
   * locality form is used for display and the legal text kept separately.
   */
  address: {
    locality: "Chak No 16 MKS",
    city: "Hanumangarh",
    state: "Rajasthan",
    pincode: "335512",
  },

  /**
   * The address exactly as it appears on the GST registration. Kept for
   * documents that must reproduce the registered particulars verbatim.
   */
  registeredAddress:
    "Murba No 81, Kila No 18/0.076, 19/0.253, 20/0.013, 22/0.228, " +
    "Chak No 16 MKS Ke Khata No 102/67, M/s Jeet Trailers 23/1/0.063, " +
    "Total 0.633 Hec Ka Half, Hanumangarh, Rajasthan 335512",
} as const;

/** One-line address for letterheads, e.g. "Chak No 16 MKS, Hanumangarh, Rajasthan 335512". */
export function addressLine(): string {
  const { locality, city, state, pincode } = BUSINESS.address;
  return `${locality}, ${city}, ${state} ${pincode}`;
}

/** Labelled GSTIN, e.g. "GSTIN: 08PHGPS8765A1ZM". */
export function gstinLine(): string {
  return `GSTIN: ${BUSINESS.gstin}`;
}
