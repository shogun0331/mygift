const fs = require('fs');
const path = require('path');

function createSimpleBmp(width, height, r, g, b) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const buffer = Buffer.alloc(fileSize);

  // File Header
  buffer.write('BM', 0); // Signature
  buffer.writeUInt32LE(fileSize, 2); // File Size
  buffer.writeUInt32LE(0, 6); // Reserved
  buffer.writeUInt32LE(54, 10); // Offset to pixel data

  // DIB Header
  buffer.writeUInt32LE(40, 14); // Header size
  buffer.writeInt32LE(width, 18); // Width
  buffer.writeInt32LE(height, 22); // Height
  buffer.writeUInt16LE(1, 26); // Planes
  buffer.writeUInt16LE(24, 28); // Bits per pixel
  buffer.writeUInt32LE(0, 30); // Compression
  buffer.writeUInt32LE(pixelDataSize, 34); // Image size
  buffer.writeInt32LE(2835, 38); // X
  buffer.writeInt32LE(2835, 42); // Y
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);

  // Pixel Data (BGR, bottom-to-top)
  let offset = 54;
  for (let y = 0; y < height; y++) {
    // 윗부분과 아랫부분에 아주 간단한 어두운 회색의 테두리를 그려서 밋밋함을 덜어줌
    const isBorderRow = (y < 4 || y > height - 5);
    for (let x = 0; x < width; x++) {
      const isBorderCol = (x < 4 || x > width - 5);
      
      if (isBorderRow || isBorderCol) {
        // Border color: Dark grey (RGB: 40, 40, 40)
        buffer[offset] = 40;
        buffer[offset + 1] = 40;
        buffer[offset + 2] = 40;
      } else {
        // Background color: Dark Neon Violet (RGB: r, g, b)
        buffer[offset] = b;
        buffer[offset + 1] = g;
        buffer[offset + 2] = r;
      }
      offset += 3;
    }
    const padding = rowSize - (width * 3);
    for (let p = 0; p < padding; p++) {
      buffer[offset] = 0;
      offset++;
    }
  }

  return buffer;
}

const targetPath = path.join(__dirname, '../public/loading_splash.bmp');
const publicDir = path.dirname(targetPath);

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 640x400 크기의 어두운 네온 바이올렛 (RGB: 26, 12, 48) 스플래시 이미지 생성
const bmpBuffer = createSimpleBmp(640, 400, 26, 12, 48);
fs.writeFileSync(targetPath, bmpBuffer);
console.log(`[Splash] Created loading splash image at: ${targetPath}`);
