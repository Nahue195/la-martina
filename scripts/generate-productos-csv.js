const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('C:/Users/nahue/Downloads/Lista de Precios Actualizada ENERO.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const rows = data.filter(r => typeof r[0] === 'number' && r[1] && r[2]);

function categorize(name) {
  const n = name.toLowerCase();
  if (/fotocopi|resma|papel a4|papel a3|papel bond|papel 75|papel 80/.test(n)) return 'Fotocopias';
  if (/toner|tinta|cartucho|ribbon|drum|impres/.test(n)) return 'Impresiones';
  if (/anillad|espiral|tapa|encuader|rulo|wire/.test(n)) return 'Encuadernado';
  if (/plastif|laminad|funda termolamina/.test(n)) return 'Plastificado';
  if (/scanner|escaneo/.test(n)) return 'Escaneo';
  if (/cuaderno|libreta|agenda|block|bloc /.test(n)) return 'Cuadernos';
  if (/carpeta|portafolios|bibliorato|archivad/.test(n)) return 'Carpetas';
  if (/lapiz|lapicera|birome|boligrafo|marcador|resaltador|fibron|fibrón|pluma|roller|micropunta/.test(n)) return 'Escritura';
  if (/goma|tijera|regla|compas|sacapuntas|corrector|liquid paper/.test(n)) return 'Útiles';
  if (/mochila|cartuchera|estuche|bolso/.test(n)) return 'Mochilas y Cartucheras';
  if (/acuarela|pintura|pincel|lienzo|paleta|tempera|oleo/.test(n)) return 'Arte';
  if (/broches|gramp|clip|sujetapapel|cinta adhesiva|scotch|celo|pritt|adhesivo|pegamento|cola/.test(n)) return 'Insumos Oficina';
  if (/perforadora|abrochadora|guillotina|plastificadora|encuadernadora|fellowes/.test(n)) return 'Máquinas';
  if (/folio|hoja|papel madera|papel afiche|cartulina|carton|papel glasé|glasé/.test(n)) return 'Papelería';
  if (/sobre|burbuja|embalaje|paquete/.test(n)) return 'Embalaje';
  if (/calculadora|agenda electr|reloj/.test(n)) return 'Electrónica';
  if (/abecedario|goma eva|foam|crepe|crepé|cotillon|disfraz|fieltro/.test(n)) return 'Manualidades';
  if (/marco|portarretrato/.test(n)) return 'Decoración';
  return 'Otros';
}

function escapeCSV(v) {
  const s = String(v).trim();
  const needsQuote = s.includes(',') || s.includes('"') || s.includes('\n');
  if (needsQuote) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

let csv = 'name,price,category,active,sort_order\n';
rows.forEach((r, i) => {
  const name = String(r[1]).trim();
  const price = parseFloat(r[2]) || 0;
  const cat = categorize(name);
  csv += escapeCSV(name) + ',' + price + ',' + escapeCSV(cat) + ',true,' + (i + 1) + '\n';
});

const outPath = 'C:/Users/nahue/Desktop/productos_import.csv';
fs.writeFileSync(outPath, csv, 'utf8');

// Resumen por categoría
const cats = {};
rows.forEach(r => {
  const cat = categorize(String(r[1]).trim());
  cats[cat] = (cats[cat] || 0) + 1;
});
console.log('CSV generado:', rows.length, 'productos');
console.log('Archivo:', outPath);
console.log('\nDistribucion por categoria:');
Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(' ', n.toString().padStart(5), c));
