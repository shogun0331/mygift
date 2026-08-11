const fs = require('fs');
const path = require('path');

const XOR_KEY = Buffer.from([0x7E, 0x3F, 0x1A, 0x9B, 0x5C, 0xD2, 0x48, 0xFE]);

function xorBuffer(buffer) {
  const result = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] ^ XOR_KEY[i % XOR_KEY.length];
  }
  return result;
}

function isPlaintext(buffer, ext) {
  if (buffer.length === 0) return false;
  
  if (ext === '.json') {
    return buffer[0] === 0x7B || buffer[0] === 0x5B; // '{' or '['
  }
  
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true; // PNG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true; // JPEG
  
  if (buffer.length > 12) {
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') return true;
  }
  
  if (buffer.length > 3 && buffer.slice(0, 3).toString('ascii') === 'GIF') return true;
  if (buffer.length > 8 && buffer.slice(4, 8).toString('ascii') === 'ftyp') return true; // MP4
  if (buffer.length > 3 && buffer.slice(0, 3).toString('ascii') === 'ID3') return true; // MP3
  
  if (buffer.length > 12) {
    const riff = buffer.slice(0, 4).toString('ascii');
    const wave = buffer.slice(8, 12).toString('ascii');
    if (riff === 'RIFF' && wave === 'WAVE') return true;
  }
  
  if (buffer.length > 4 && buffer.slice(0, 4).toString('ascii') === 'OggS') return true;

  return false;
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.zip' || ext === '.svg' || file === '.DS_Store') continue;
      
      const buffer = fs.readFileSync(fullPath);
      if (isPlaintext(buffer, ext)) {
        console.log(`[Auto Encrypt] Encrypting plaintext asset: ${fullPath}`);
        const encrypted = xorBuffer(buffer);
        fs.writeFileSync(fullPath, encrypted);
      }
    }
  }
}

// target dirs in C drive temp build output path
const targetDirs = [
  'C:/Users/shogu/AppData/Local/Temp/broadcast-game-dist/win-unpacked/resources/app.asar.unpacked/public/characters',
  'C:/Users/shogu/AppData/Local/Temp/broadcast-game-dist/win-unpacked/resources/app.asar.unpacked/public/chapter_assets'
];

for (const dir of targetDirs) {
  console.log(`[Auto Encrypt] Scanning directory: ${dir}`);
  processDirectory(dir);
}
console.log('[Auto Encrypt] All target assets successfully processed.');
