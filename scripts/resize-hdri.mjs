/** Downsample the CC0 source HDRI in linear radiance. No image dependencies. */
import fs from 'node:fs/promises'
import { FloatType } from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'

const sourcePath = 'public/environment/studio.hdr'
const outputPath = 'public/environment/studio-512.hdr'
const source = await fs.readFile(sourcePath)
const loader = new HDRLoader().setDataType(FloatType)
const decode = (bytes) =>
  loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
const image = decode(source)
if (image.width !== 1024 || image.height !== 512)
  throw new Error('Expected a 1024 × 512 source HDRI')
const width = image.width / 2
const height = image.height / 2
const radiance = new Float32Array(width * height * 4)

// Average radiance, never gamma-encoded RGB or RGBE bytes. This retains bright
// softbox energy instead of clipping the HDR values during image conversion.
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const dst = (y * width + x) * 4
    for (let channel = 0; channel < 3; channel++) {
      let sum = 0
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          sum += image.data[((y * 2 + dy) * image.width + x * 2 + dx) * 4 + channel]
        }
      }
      radiance[dst + channel] = sum / 4
    }
    radiance[dst + 3] = 1
  }
}

function encodeChannel(channel) {
  const encoded = []
  let offset = 0
  const runLength = (start) => {
    let count = 1
    while (
      start + count < channel.length &&
      count < 127 &&
      channel[start + count] === channel[start]
    ) {
      count++
    }
    return count
  }
  while (offset < channel.length) {
    const run = runLength(offset)
    if (run >= 4) {
      encoded.push(128 + run, channel[offset])
      offset += run
    } else {
      const start = offset++
      while (offset < channel.length && offset - start < 128 && runLength(offset) < 4) offset++
      encoded.push(offset - start, ...channel.subarray(start, offset))
    }
  }
  return Buffer.from(encoded)
}

const buffers = [
  Buffer.from(
    `#?RADIANCE\n# Linear radiance 2x2 box filter; source: Poly Haven Studio Small 03 (CC0)\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`,
  ),
]
for (let y = 0; y < height; y++) {
  const channels = Array.from({ length: 4 }, () => new Uint8Array(width))
  for (let x = 0; x < width; x++) {
    const src = (y * width + x) * 4
    const maximum = Math.max(radiance[src], radiance[src + 1], radiance[src + 2])
    if (maximum < 1e-32) continue
    const exponent = Math.ceil(Math.log2(maximum))
    // Three HDRLoader uses 255 for its RGBE normalization. Match the decoder
    // used by this application so downsampling does not change exposure.
    const scale = 255 / 2 ** exponent
    for (let channel = 0; channel < 3; channel++) {
      channels[channel][x] = Math.min(255, Math.round(radiance[src + channel] * scale))
    }
    channels[3][x] = exponent + 128
  }
  buffers.push(Buffer.from([2, 2, width >> 8, width & 255]))
  for (const channel of channels) buffers.push(encodeChannel(channel))
}
const output = Buffer.concat(buffers)
const roundTrip = decode(output)
let energy = 0
let restoredEnergy = 0
let error = 0
let peak = 0
for (let i = 0; i < radiance.length; i++) {
  if (i % 4 === 3) continue
  const expected = radiance[i]
  const actual = roundTrip.data[i]
  if (!Number.isFinite(actual) || actual < 0) throw new Error('Invalid encoded radiance')
  energy += expected
  restoredEnergy += actual
  error += (expected - actual) ** 2
  peak = Math.max(peak, expected)
}
const relativeEnergyDrift = Math.abs(restoredEnergy - energy) / energy
if (relativeEnergyDrift > 0.005) throw new Error('HDR energy drift exceeds 0.5%')
await fs.writeFile(outputPath, output)
console.log(
  JSON.stringify(
    {
      source: {
        path: sourcePath,
        width: image.width,
        height: image.height,
        bytes: source.byteLength,
      },
      output: { path: outputPath, width, height, bytes: output.byteLength },
      pixelsReduction: 0.75,
      bytesReduction: 1 - output.byteLength / source.byteLength,
      relativeEnergyDrift,
      normalizedRmse: Math.sqrt(error / (width * height * 3)) / peak,
      peakLinearRadiance: peak,
    },
    null,
    2,
  ),
)
