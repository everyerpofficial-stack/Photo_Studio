import { createServerFn } from "@tanstack/react-start";
import { uuid, nowIso } from "./utils";
import { loadStore, saveStore, type Row } from "./records";


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

    const id = uuid();
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    const base64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(buf).toString("base64");
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;

    const docRecord: Row = {
      id,
      entity_type: entityType,
      entity_id: entityId,
      file_path: dataUrl,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_at: nowIso(),
    };

    const store = loadStore();
    store.documents.push(docRecord);
    saveStore(store);

    return docRecord as any;
  });

export const getDocumentUrl = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const store = loadStore();
    const doc = store.documents.find((d) => d["id"] === data.id);
    if (!doc) throw new Error("File not found.");
    return {
      dataUrl: String(doc["file_path"]),
      fileName: String(doc["file_name"]),
    };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const store = loadStore();
    store.documents = store.documents.filter((d) => d["id"] !== data.id);
    saveStore(store);
    return data.id;
  });


