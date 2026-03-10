const xlsx = require('xlsx');
const fs = require('fs');
const workbook = xlsx.readFile('../DormSync_TestCases.xlsx');
const out = {};
workbook.SheetNames.forEach(sheetName => {
    out[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
});
fs.writeFileSync('excel_dump.json', JSON.stringify(out, null, 2));
console.log("Written to excel_dump.json");
