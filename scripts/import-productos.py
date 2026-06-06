import openpyxl
import requests
import json
from pathlib import Path

# Leer .env desde la raíz del proyecto
env_path = Path(__file__).parent.parent / '.env'
env = {}
for line in env_path.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

SUPABASE_URL = env['VITE_SUPABASE_URL']
SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY']
HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

def _parse_barcode(barcode):
    if barcode is None:
        return None
    s = str(barcode).strip()
    if s == '':
        return None
    try:
        return str(int(float(s)))
    except ValueError:
        # barcode is a non-numeric string (e.g. 'RENZ000003712'), keep as-is
        return s


# Leer Excel
excel_path = Path(__file__).parent.parent / 'Lista_de_Precios_ALE_Actualizada_con_venta.xlsx'
wb = openpyxl.load_workbook(excel_path)
ws = wb.active

rows = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 3:  # saltar las 3 filas de cabecera
        continue
    codigo, descripcion, _precio, _fecha, barcode, _upaq, _ucaja, precio_100 = row[:8]
    if not descripcion or not precio_100:
        continue
    rows.append({
        'name': str(descripcion).strip(),
        'price': float(precio_100),
        'category': 'Otros',
        'description': None,
        'active': True,
        'sort_order': i,
        'barcode': _parse_barcode(barcode),
    })

print(f'Productos leídos del Excel: {len(rows)}')

# Eliminar todos los productos existentes
print('Eliminando productos existentes...')
resp = requests.delete(
    f'{SUPABASE_URL}/rest/v1/productos?id=not.is.null',
    headers={**HEADERS, 'Prefer': 'return=minimal'},
)
print(f'Delete status: {resp.status_code}')
if resp.status_code not in (200, 204):
    print(f'Error al eliminar: {resp.text}')
    exit(1)

# Insertar en batches de 500
BATCH = 500
total_inserted = 0
for i in range(0, len(rows), BATCH):
    batch = rows[i:i + BATCH]
    resp = requests.post(
        f'{SUPABASE_URL}/rest/v1/productos',
        headers={**HEADERS, 'Prefer': 'return=minimal'},
        data=json.dumps(batch),
    )
    if resp.status_code not in (200, 201):
        print(f'Error en batch {i // BATCH + 1}: {resp.text}')
        exit(1)
    total_inserted += len(batch)
    print(f'Batch {i // BATCH + 1}: {total_inserted}/{len(rows)} insertados')

print(f'\nImportacion completada: {total_inserted} productos.')
