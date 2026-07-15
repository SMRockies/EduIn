export async function extractFromExcel(buffer) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets = [];
  let totalRows = 0;

  workbook.eachSheet((sheet) => {
    const rows = [];
    sheet.eachRow((row) => {
      rows.push(row.values.slice(1).join("\t"));
    });
    sheets.push({ name: sheet.name, rows });
    totalRows += rows.length;
  });

  const text = sheets
    .map((s) => `=== ${s.name} ===\n${s.rows.join("\n")}`)
    .join("\n\n");

  return {
    extractedText: text,
    pages: totalRows,
    metadata: {
      sheetCount: sheets.length,
      sheetNames: sheets.map((s) => s.name)
    }
  };
}