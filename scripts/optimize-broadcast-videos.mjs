import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const jsonPath = path.join(root, 'public/characters/characters.json')
const characters = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
const now = Date.now()

function probe(file) {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,avg_frame_rate',
      '-of',
      'json',
      file,
    ],
    { encoding: 'utf8' },
  )
  const stream = JSON.parse(out).streams?.[0] ?? {}
  const [num, den] = String(stream.avg_frame_rate || '24/1').split('/').map(Number)
  const fps = den ? num / den : 24
  return {
    width: Number(stream.width) || 0,
    height: Number(stream.height) || 0,
    fps: Number.isFinite(fps) && fps > 0 ? fps : 24,
  }
}

let encoded = 0
let skipped = 0
let missing = 0

for (const character of characters) {
  let changed = false
  for (const video of character.videos ?? []) {
    if (!video.fileName) continue
    const file = path.join(root, 'public/characters', character.id, 'videos', video.fileName)
    if (!fs.existsSync(file)) {
      console.log('missing', file)
      missing += 1
      continue
    }
    const info = probe(file)
    if (info.width > 0 && info.width <= 640 && info.height <= 360) {
      skipped += 1
      continue
    }
    const tmp = `${file}.opt.mp4`
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        file,
        '-map',
        '0:v:0',
        '-map',
        '0:a?',
        '-vf',
        'scale=640:-2',
        '-r',
        String(info.fps),
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'medium',
        '-b:v',
        '1.5M',
        '-maxrate',
        '2.5M',
        '-bufsize',
        '4M',
        '-c:a',
        'aac',
        '-b:a',
        '64k',
        '-movflags',
        '+faststart',
        tmp,
      ],
      { stdio: 'inherit' },
    )
    fs.rmSync(file)
    fs.renameSync(tmp, file)
    video.fileSize = fs.statSync(file).size
    changed = true
    encoded += 1
    console.log(`ok ${character.id} ${video.fileName} (${info.width}x${info.height} -> 640)`)
  }
  if (changed) character.mediaRevision = now
}

fs.writeFileSync(jsonPath, `${JSON.stringify(characters, null, 2)}\n`)
console.log(JSON.stringify({ encoded, skipped, missing }, null, 2))
