const fs = require('fs');
const path = require('path');

const localCsv = path.join(__dirname, '../filtered_data_normal.csv');
const userCsv = path.join(process.env.USERPROFILE || '', 'Documents', '카카오톡 받은 파일', 'filtered_data_normal.csv');
const csvPath = process.argv[2] || (fs.existsSync(localCsv) ? localCsv : userCsv);
const outPath = path.join(__dirname, '../korean-drugs.js');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === ',' && !inQuotes) || c === '\n') {
      result.push(current.trim());
      current = '';
    } else current += c;
  }
  result.push(current.trim());
  return result;
}

const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.split(/\r?\n/).filter(l => l.trim());
const headers = lines[0].split(',');
const rows = lines.slice(1).map(line => {
  const vals = line.split(',');
  const obj = {};
  headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
  return obj;
});

const drugs = rows
  .filter(r => r['품목명'])
  .map(r => ({
    name: r['품목명'],
    nameEn: r['품목 영문명'] || '',
    company: r['업체명'] || '',
    ingredient: r['주성분'] || '',
    category: r['분류명'] || '',
    image: r['큰제품이미지'] && r['큰제품이미지'] !== '-' ? r['큰제품이미지'] : '',
    type: r['전문일반구분'] || ''
  }));

const js = `// 한국 의약품 데이터 (식품의약품안전처)
// generated from filtered_data_normal.csv
const KOREAN_DRUG_DATABASE = ${JSON.stringify(drugs, null, 0)};
`;

fs.writeFileSync(outPath, js, 'utf8');
console.log('Created', outPath, 'with', drugs.length, 'drugs');
