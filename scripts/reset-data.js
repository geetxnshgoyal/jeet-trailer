/**
 * Reset the Firestore data for a clean client handover.
 *
 * WIPES:   inventory (+ history), issues, trailers (+ history), categories,
 *          counters, so item/issue/chassis codes restart at 1.
 * KEEPS:   users (and every Firebase Auth account, this script never touches
 *          Auth, so logins keep working).
 *
 * The seven default categories are re-seeded automatically by the app on the
 * first GET /api/categories, so clearing them is safe, and they come back
 * with Rim/Tyre correctly marked as not serial-tracked.
 *
 * A full JSON backup is written before anything is deleted, so a mistaken run
 * can be reconstructed. Dry-run by default.
 *
 * Usage:
 *   node scripts/reset-data.js            # preview counts + write backup only
 *   node scripts/reset-data.js --apply    # back up, then delete
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "..");

/** Collections cleared by this script. `users` is deliberately absent. */
const WIPE = ["inventory", "issues", "trailers", "categories", "counters"];
/** Subcollections that hang off documents in the collections above. */
const SUBCOLLECTIONS = { inventory: "history", trailers: "history" };

function loadEnv() {
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

async function main() {
  loadEnv();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error("Missing Firebase admin credentials in .env.local");
    process.exit(1);
  }

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
  console.log(APPLY ? "Mode:    APPLY (deleting)\n" : "Mode:    DRY RUN (backup only, no deletes)\n");

  // ---- read everything first, so the backup is complete ----
  const backup = {};
  let total = 0;

  for (const name of WIPE) {
    const snap = await db.collection(name).get();
    const docs = [];
    for (const doc of snap.docs) {
      const entry = { id: doc.id, data: doc.data() };
      const sub = SUBCOLLECTIONS[name];
      if (sub) {
        const subSnap = await doc.ref.collection(sub).get();
        if (!subSnap.empty) {
          entry[sub] = subSnap.docs.map((d) => ({ id: d.id, data: d.data() }));
        }
      }
      docs.push(entry);
    }
    backup[name] = docs;
    total += docs.length;
    console.log(`  ${name.padEnd(12)} ${String(docs.length).padStart(4)} doc(s)`);
  }

  const userSnap = await db.collection("users").get();
  console.log(`\n  users        ${String(userSnap.size).padStart(4)} doc(s)  ← KEPT`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(ROOT, "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `firestore-backup-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written: ${path.relative(ROOT, backupFile)}`);

  if (!APPLY) {
    console.log(`\nDry run. ${total} doc(s) would be deleted across ${WIPE.length} collections.`);
    console.log("Re-run with --apply to delete them.");
    return;
  }

  // recursiveDelete removes each document's subcollections too.
  for (const name of WIPE) {
    await db.recursiveDelete(db.collection(name));
    console.log(`  cleared ${name}`);
  }

  console.log(`\nDone. Deleted ${total} doc(s). ${userSnap.size} user(s) untouched.`);
  console.log("Default categories will re-seed on the next app load.");
}

main().catch((err) => {
  console.error("Reset failed:", err.message);
  process.exit(1);
});
