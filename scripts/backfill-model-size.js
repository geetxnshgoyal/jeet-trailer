/**
 * Backfill `model` and `spec` (size) on existing inventory items.
 *
 * Rim and Tyre stopped being serial-tracked, they are identified by model and
 * size instead, but items created before that change never captured either
 * field. This derives them from the item name, which is where the shop has
 * been putting that information all along.
 *
 * Guarantees:
 *   - Only ever FILLS EMPTY fields. An item that already has a model or size
 *     is left untouched.
 *   - Only writes `model` and `spec`. Nothing is deleted, no history events
 *     are appended, no other collection is read or written.
 *   - Dry-run by default. Pass --apply to actually write.
 *
 * Usage:
 *   node scripts/backfill-model-size.js            # preview only
 *   node scripts/backfill-model-size.js --apply    # write the changes
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "..");

/**
 * Minimal .env reader, Next.js loads these automatically at runtime, but a
 * standalone node script does not. Values are used, never printed.
 */
function loadEnv() {
  // Quoted values may span multiple lines (a PEM private key does), so parse
  // the whole file rather than line by line.
  const ENTRY =
    /^\s*(?:export\s+)?([\w.-]+)\s*=\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]*)/gm;

  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    const contents = fs.readFileSync(full, "utf8");

    let match;
    while ((match = ENTRY.exec(contents)) !== null) {
      const key = match[1];
      let value = (match[2] || "").trim();
      const quote = value[0];
      if (
        (quote === '"' || quote === "'" || quote === "`") &&
        value.endsWith(quote) &&
        value.length > 1
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

/**
 * Size patterns seen on the workshop floor, most specific first:
 *   295/80 R22.5 · 10.00-20 · 3.15mm · 15 kg · 4 inch
 */
const SIZE_PATTERNS = [
  /\b\d{3}\/\d{2}\s?-?\s?R?\s?\d{2}(?:\.\d)?\b/i,
  /\b\d{1,2}\.\d{2}\s?-\s?\d{2}\b/,
  /\b\d+(?:\.\d+)?\s?(?:mm|cm|kg|gm|g|inch|in|ft|feet|")\b/i,
  /\bR\s?\d{2}(?:\.\d)?\b/i,
];

/** Pull a size-looking token out of a name; returns null when none matches. */
function extractSize(name) {
  for (const pattern of SIZE_PATTERNS) {
    const match = name.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

/**
 * Derive the model from the name: the name minus the size token and minus a
 * leading brand (the brand is stored separately, so repeating it adds noise).
 */
function deriveModel(name, brand, size, categoryName) {
  let model = name;
  if (size) model = model.replace(size, " ");
  if (brand && brand.trim()) {
    const b = brand.trim();
    const leading = new RegExp(`^\\s*${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
    model = model.replace(leading, " ");
  }
  model = model.replace(/\s+/g, " ").trim();
  if (!model) return null;

  // "MRF Tyre" would reduce to just "Tyre", the category, not a model.
  // Writing that is worse than leaving the field empty for the admin to fill.
  const normalise = (s) => s.toLowerCase().replace(/s$/, "").replace(/\s+/g, " ").trim();
  if (categoryName && normalise(model) === normalise(categoryName)) return null;

  return model;
}

async function main() {
  loadEnv();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error(
      "Missing Firebase admin credentials. Expected FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env.local",
    );
    process.exit(1);
  }

  // Next.js's dotenv unescapes quoted values before the app's own newline
  // fix-up runs; reading the file directly skips that, so keys stored as
  // "\\n" would keep a stray backslash per line. Collapse any run of
  // backslashes before an "n", base64 never contains a backslash.
  const privateKey = privateKeyRaw
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/\\+n/g, "\n")
    .replace(/\\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
  });

  const db = admin.firestore();
  console.log(`Project: ${projectId}`);
  console.log(APPLY ? "Mode:    APPLY (writing)\n" : "Mode:    DRY RUN (no writes)\n");

  const snap = await db.collection("inventory").get();
  if (snap.empty) {
    console.log("No inventory items found.");
    return;
  }

  const planned = [];
  let alreadyComplete = 0;

  for (const doc of snap.docs) {
    const item = doc.data();
    const name = (item.name || "").trim();
    if (!name) continue;

    const hasModel = !!(item.model && String(item.model).trim());
    const hasSize = !!(item.spec && String(item.spec).trim());
    if (hasModel && hasSize) {
      alreadyComplete++;
      continue;
    }

    const size = extractSize(name);
    const update = {};
    if (!hasSize && size) update.spec = size;
    if (!hasModel) {
      const model = deriveModel(name, item.brand, size, item.categoryName);
      if (model) update.model = model;
    }

    if (Object.keys(update).length === 0) {
      alreadyComplete++;
      continue;
    }
    planned.push({ id: doc.id, code: item.code, name, category: item.categoryName, update });
  }

  for (const p of planned) {
    const parts = [];
    if (p.update.model !== undefined) parts.push(`model="${p.update.model}"`);
    if (p.update.spec !== undefined) parts.push(`size="${p.update.spec}"`);
    console.log(`  ${String(p.code || p.id).padEnd(12)} ${p.name.padEnd(28)} → ${parts.join("  ")}`);
  }

  console.log(
    `\n${planned.length} item(s) to update, ${alreadyComplete} already complete or nothing to derive.`,
  );

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write these changes.");
    return;
  }
  if (planned.length === 0) return;

  // Firestore caps a batch at 500 writes.
  for (let i = 0; i < planned.length; i += 400) {
    const batch = db.batch();
    for (const p of planned.slice(i, i + 400)) {
      batch.set(db.collection("inventory").doc(p.id), p.update, { merge: true });
    }
    await batch.commit();
  }
  console.log(`\nDone. Updated ${planned.length} item(s).`);
}

main().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
