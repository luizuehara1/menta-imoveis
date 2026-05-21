import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1x1 transparent PNG as fallback for watermark
const watermarkBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// A simple small gray placeholder PNG (10x10) to be a valid file
const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAADklEQVR42mNk+M9QDwAD7gH/D6P9PwAAAABJRU5ErkJggg==';

const watermarkPath = path.join(publicDir, 'watermark.png');
const placeholderPath = path.join(publicDir, 'placeholder-imovel.png');

fs.writeFileSync(watermarkPath, Buffer.from(watermarkBase64, 'base64'));
fs.writeFileSync(placeholderPath, Buffer.from(placeholderBase64, 'base64'));

console.log('Public placeholders generated successfully!');
