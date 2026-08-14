import { createServerFn } from "@tanstack/react-start";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDb, uploadsDir, uuid, nowIso } from "./server/db.server";

const MAX_BYTES = 10 * 1024 * 1024;

export const uploadDocument = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const file = data.get("file");
    const entityType = String(data.get("entityType") ?? "");
    const entityId = String(data.get("entityId") ?? "");
    if (!(file instanceof File)) throw new Error("No file provided.");
    if (!entityType || !entityId) throw new Error("Missing entity reference.");
    if (file.size > MAX_BYTES) throw new Error(`${file.name}: file must be under 10 MB.`);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const id = uuid();
    const relPath = `${entityType}/${entityId}/${id}.${ext}`;
    const fullPath = path.join(uploadsDir(), relPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buf);

    const db = getDb();
    db.prepare(
      "INSERT INTO documents (id, entity_type, entity_id, file_path, file_name, mime_type, size_bytes, created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).run(id, entityType, entityId, relPath, file.name, file.type || null, file.size, nowIso());

    return db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  });

export const getDocumentUrl = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb();
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(data.id) as
      { file_path: string; file_name: string; mime_type: string | null } | undefined;
    if (!doc) throw new Error("File not found.");
    const buf = await readFile(path.join(uploadsDir(), doc.file_path));
    const base64 = buf.toString("base64");
    return {
      dataUrl: `data:${doc.mime_type || "application/octet-stream"};base64,${base64}`,
      fileName: doc.file_name,
    };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb();
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(data.id) as
      { file_path: string } | undefined;
    if (!doc) return;
    db.prepare("DELETE FROM documents WHERE id = ?").run(data.id);
    await unlink(path.join(uploadsDir(), doc.file_path)).catch(() => {});
  });
