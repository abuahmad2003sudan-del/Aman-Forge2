const encoder = new TextEncoder();
const CRC_TABLE = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function safePath(value, fallback) {
  const parts = String(value || '')
    .replace(/\\/g, '/')
    .replace(/^[a-z]:/i, '')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => part.replace(/[\u0000-\u001f]/g, '').trim())
    .filter(Boolean);
  return parts.join('/') || fallback;
}

function uniquePath(path, used) {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }
  const parts = path.split('/');
  const file = parts.pop();
  const dot = file.lastIndexOf('.');
  const base = dot > 0 ? file.slice(0, dot) : file;
  const ext = dot > 0 ? file.slice(dot) : '';
  let suffix = 2;
  let candidate = '';
  do {
    candidate = [...parts, `${base}-${suffix}${ext}`].join('/');
    suffix += 1;
  } while (used.has(candidate));
  used.add(candidate);
  return candidate;
}

function write16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function write32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

export function createProjectZip(files, title = 'AMAN FORGE project', version = 0) {
  const sourceFiles = Array.isArray(files) ? files : [];
  if (!sourceFiles.length) throw new Error('لا توجد ملفات لتصديرها.');

  const used = new Set();
  const entries = sourceFiles
    .filter((file) => file && typeof file.path === 'string' && typeof file.content === 'string')
    .map((file, index) => ({
      name: uniquePath(safePath(file.path, `file-${index + 1}.txt`), used),
      bytes: encoder.encode(file.content),
    }));

  if (!entries.length) throw new Error('لا توجد ملفات نصية قابلة للتصدير.');
  if (entries.length >= 65535) throw new Error('عدد الملفات كبير جداً لصيغة ZIP الحالية.');
  const totalBytes = entries.reduce((total, entry) => total + entry.bytes.length, 0);
  if (totalBytes > 25 * 1024 * 1024) throw new Error('حجم المشروع أكبر من حد التصدير الآمن (25 MB).');

  const readme = [
    '# AMAN FORGE project export',
    '',
    `Project: ${String(title || 'Untitled project')}`,
    `Version: ${String(version ?? 0)}`,
    '',
    'This archive contains the project files as saved in AMAN FORGE.',
    'Open index.html (or the main HTML file) to start, if the project supports local file loading.',
    'Some projects may require a web server, dependencies, or internet access to run.',
    '',
    'The AMAN FORGE live preview runs in a restricted sandbox. This ZIP is source export only;',
    'it does not include a production build, install dependencies, or validate external services.',
  ].join('\n');
  entries.push({
    name: uniquePath('AMAN-FORGE-README.md', used),
    bytes: encoder.encode(readme),
  });

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.bytes;
    if (nameBytes.length > 65535 || data.length > 0xffffffff) {
      throw new Error('ملف يتجاوز حدود صيغة ZIP الحالية.');
    }
    const checksum = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0x0800);
    write16(localView, 8, 0);
    write16(localView, 10, 0);
    write16(localView, 12, 0);
    write32(localView, 14, checksum);
    write32(localView, 18, data.length);
    write32(localView, 22, data.length);
    write16(localView, 26, nameBytes.length);
    write16(localView, 28, 0);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800);
    write16(centralView, 10, 0);
    write16(centralView, 12, 0);
    write16(centralView, 14, 0);
    write32(centralView, 16, checksum);
    write32(centralView, 20, data.length);
    write32(centralView, 24, data.length);
    write16(centralView, 28, nameBytes.length);
    write16(centralView, 30, 0);
    write16(centralView, 32, 0);
    write16(centralView, 34, 0);
    write16(centralView, 36, 0);
    write32(centralView, 38, 0);
    write32(centralView, 42, localOffset);
    central.set(nameBytes, 46);
    centralParts.push(central);

    localOffset += local.length;
    centralSize += central.length;
    if (localOffset > 0xffffffff || centralSize > 0xffffffff) {
      throw new Error('حجم المشروع أكبر من حد صيغة ZIP الحالية.');
    }
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 4, 0);
  write16(endView, 6, 0);
  write16(endView, 8, entries.length);
  write16(endView, 10, entries.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, localOffset);
  write16(endView, 20, 0);

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}
