import * as XLSX from "xlsx";

export type XlsxSheet = {
  name: string;
  data: Array<Array<string | number | null | undefined>>;
};

export const downloadXlsx = (sheets: XlsxSheet[], baseName: string): void => {
  if (!sheets.length) return;
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const safeName = (s.name || "Sheet1").slice(0, 31);
    const ws = XLSX.utils.aoa_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safeBase = baseName || "report";
  a.download = `${safeBase}_${ts}.xlsx`;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

