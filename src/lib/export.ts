import { fmtDate } from "./format";

export type ExportColumn<T> = { header: string; value: (row: T) => string | number };

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function exportCSV<T>(rows: T[], columns: ExportColumn<T>[], name: string) {
  const csv = [
    columns.map((c) => esc(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(",")),
  ].join("\n");
  download(csv, `${name}-${fmtDate(new Date())}.csv`, "text/csv;charset=utf-8;");
}

/** Excel-compatible SpreadsheetML export (opens natively in Excel as .xls). */
export function exportExcel<T>(rows: T[], columns: ExportColumn<T>[], name: string) {
  const escXml = (v: string | number) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const head = columns.map((c) => `<Cell><Data ss:Type="String">${escXml(c.header)}</Data></Cell>`).join("");
  const body = rows
    .map(
      (r) =>
        `<Row>${columns
          .map((c) => {
            const v = c.value(r);
            const isNum = typeof v === "number" && Number.isFinite(v);
            return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${escXml(v)}</Data></Cell>`;
          })
          .join("")}</Row>`,
    )
    .join("");
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${escXml(
    name,
  ).slice(0, 28)}"><Table><Row>${head}</Row>${body}</Table></Worksheet></Workbook>`;
  download(xml, `${name}-${fmtDate(new Date())}.xls`, "application/vnd.ms-excel");
}

/** Opens a print-ready window (Save as PDF) with LEONIS branding. */
export function printDocument(title: string, innerHtml: string) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Inter,Arial,sans-serif;color:#1a1a1a;padding:40px;font-size:13px}
    h1{font-size:22px;margin:0;color:#1F3864;letter-spacing:2px}
    .sub{color:#808080;font-size:12px;margin-top:2px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1F3864;padding-bottom:12px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#D9E1F2;color:#1F3864;text-align:left;padding:8px;font-size:12px}
    td{padding:7px 8px;border-bottom:1px solid #eee;font-size:12px}
    tr:nth-child(even) td{background:#fafafa}
    .r{text-align:right}
    .tot{font-weight:600;background:#F2F2F2!important}
    .kv{display:flex;gap:32px;flex-wrap:wrap;margin:14px 0}
    .kv div{font-size:12px}
    .kv b{display:block;font-size:15px;color:#1F3864}
    .foot{margin-top:36px;color:#808080;font-size:11px;border-top:1px solid #eee;padding-top:10px}
  </style></head><body>
  <div class="head"><div><h1>LEONIS</h1><div class="sub">Photography &amp; Content Production · Surat</div></div>
  <div style="text-align:right"><div style="font-weight:600">${title}</div><div class="sub">${fmtDate(new Date())}</div></div></div>
  ${innerHtml}
  <div class="foot">Computer generated document · LEONIS Studio, Surat · studio@leonis.in</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}
