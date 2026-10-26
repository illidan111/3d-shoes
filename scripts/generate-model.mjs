/** Original, unbranded sneaker model. Rebuild: node scripts/generate-model.mjs */
import fs from 'node:fs/promises'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// GLTFExporter supports Node with this small Blob/FileReader bridge.
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
  async readAsDataURL(blob) {
    this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`
    this.onloadend?.()
  }
}

const palette = { body: '#617a96', sole: '#ede9df', lace: '#f1eee5', tongue: '#29343f' }
const chunks = new Map()
const materials = new Map()
function material(part, detail, shade = 1, roughness = 0.83, metalness = 0) {
  const key = `${part}_${detail}`
  if (!materials.has(key)) {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette[part]).multiplyScalar(shade),
      roughness,
      metalness,
      side: THREE.DoubleSide,
    })
    m.name = key
    m.userData = { part, shade }
    materials.set(key, m)
  }
  return key
}
const body = material('body', 'knit', 1, 0.91)
const suede = material('body', 'suede', 0.78, 0.95)
const trim = material('body', 'trim', 1.12, 0.72)
const thread = material('body', 'stitch', 1.35, 0.9)
const lining = material('tongue', 'lining', 0.58, 1)
const tongue = material('tongue', 'padded', 1, 0.9)
const sole = material('sole', 'foam', 1, 0.84)
const soleGroove = material('sole', 'grooves', 0.73, 0.98)
const tread = material('sole', 'rubber', 0.28, 0.96)
const lace = material('lace', 'woven', 1, 0.95)
const eyelet = material('body', 'eyelet', 0.57, 0.35, 0.32)

function add(key, geometry) {
  if (!geometry.getAttribute('uv'))
    geometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        new Float32Array(geometry.getAttribute('position').count * 2),
        2,
      ),
    )
  if (!geometry.index) {
    const n = geometry.getAttribute('position').count
    geometry.setIndex(Array.from({ length: n }, (_, i) => i))
  }
  for (const attribute of Object.keys(geometry.attributes))
    if (!['position', 'normal', 'uv'].includes(attribute)) geometry.deleteAttribute(attribute)
  if (!chunks.has(key)) chunks.set(key, [])
  chunks.get(key).push(geometry)
}
function tube(key, points, radius = 0.008, segments = 36, closed = false, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    closed,
    'centripetal',
  )
  add(key, new THREE.TubeGeometry(curve, segments, radius, radial, closed))
}
function grid(key, nu, nv, fn, reverse = false) {
  const p = [],
    uv = [],
    idx = []
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      p.push(...fn(i / nu, j / nv))
      uv.push(i / nu, j / nv)
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j,
        b = a + nv + 1
      if (reverse) idx.push(a, a + 1, b, b, a + 1, b + 1)
      else idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  add(key, g)
}
function smoothProfile(points, x) {
  if (x <= points[0][0]) return points[0][1]
  if (x >= points.at(-1)[0]) return points.at(-1)[1]
  const i = points.findIndex((p, n) => n < points.length - 1 && x >= p[0] && x <= points[n + 1][0])
  const p0 = points[Math.max(0, i - 1)],
    p1 = points[i],
    p2 = points[i + 1],
    p3 = points[Math.min(points.length - 1, i + 2)]
  const t = (x - p1[0]) / (p2[0] - p1[0]),
    d = p2[0] - p1[0]
  const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]),
    m2 = (p3[1] - p1[1]) / (p3[0] - p1[0])
  return (
    (2 * t ** 3 - 3 * t * t + 1) * p1[1] +
    (t ** 3 - 2 * t * t + t) * d * m1 +
    (-2 * t ** 3 + 3 * t * t) * p2[1] +
    (t ** 3 - t * t) * d * m2
  )
}
const widths = [
  [-1.72, 0.015],
  [-1.61, 0.3],
  [-1.35, 0.51],
  [-0.9, 0.59],
  [-0.45, 0.57],
  [0, 0.5],
  [0.6, 0.46],
  [1.1, 0.41],
  [1.35, 0.3],
  [1.48, 0.015],
]
const heights = [
  [-1.72, 0.57],
  [-1.58, 0.72],
  [-1.2, 0.83],
  [-0.8, 0.92],
  [-0.4, 1.12],
  [0, 1.42],
  [0.35, 1.56],
  [0.8, 1.52],
  [1.2, 1.48],
  [1.4, 1.18],
  [1.48, 0.61],
]
const openings = [
  [-1.72, 0],
  [0.08, 0],
  [0.26, 0.36],
  [0.5, 0.64],
  [0.9, 0.67],
  [1.14, 0.48],
  [1.34, 0],
  [1.48, 0],
]
const lift = (x) => Math.max(0, -x - 1.1) ** 2 * 0.31
const bottom = (x) => 0.405 + lift(x) + Math.max(0, x) * 0.023
function surface(x, angle, side = 1, offset = 0) {
  const w = smoothProfile(widths, x),
    h = smoothProfile(heights, x),
    b = bottom(x)
  return [
    x,
    b + (h - b) * Math.pow(Math.max(0, Math.cos(angle)), 0.72) + offset * Math.cos(angle),
    side * (w * Math.sin(angle) + offset * Math.sin(angle)),
  ]
}
// Two continuous quarter/vamp skins meet at the toe and surround an open collar.
for (const side of [-1, 1]) {
  grid(
    body,
    100,
    40,
    (u, v) => {
      const x = -1.72 + u * 3.2,
        o = Math.max(0, smoothProfile(openings, x))
      return surface(x, o + v * (Math.PI / 2 - o), side)
    },
    side === 1,
  )
  // Inside lining gives the ankle opening real depth.
  grid(
    lining,
    46,
    15,
    (u, v) => {
      const x = 0.08 + u * 1.26,
        o = Math.max(0, smoothProfile(openings, x))
      const p = surface(x, o, side, -0.025)
      return [p[0], p[1] - v * 0.3, p[2] * (1 - v * 0.1)]
    },
    side === -1,
  )
  const rim = Array.from({ length: 51 }, (_, i) => {
    const x = 0.08 + (i / 50) * 1.26
    return surface(x, Math.max(0, smoothProfile(openings, x)), side, 0.007)
  })
  tube(tongue, rim, 0.027, 70, false, 9)
  // Layered suede mudguard follows the curved side of the upper.
  grid(
    suede,
    82,
    9,
    (u, v) => {
      const x = -1.66 + u * 3.08
      const a = 1.03 + 0.1 * Math.sin(u * Math.PI * 2)
      return surface(x, a + v * (Math.PI / 2 - a), side, 0.007)
    },
    side === 1,
  )
  tube(
    thread,
    Array.from({ length: 75 }, (_, i) => {
      const u = i / 74,
        x = -1.64 + u * 3.04,
        a = 1.06 + 0.1 * Math.sin(u * Math.PI * 2)
      return surface(x, a, side, 0.011)
    }),
    0.003,
    85,
  )
  // Three short stitched ribs form an unbranded, flush quarter reinforcement.
  for (const start of [-0.2, 0.02, 0.24]) {
    tube(
      suede,
      Array.from({ length: 22 }, (_, i) => {
        const t = i / 21
        return surface(start + t * 0.24, 0.69 + t * 0.54, side, 0.006)
      }),
      0.018,
      24,
      false,
      6,
    )
  }
  // Heel reinforcement with double seam.
  grid(
    suede,
    36,
    16,
    (u, v) => {
      const x = 0.87 + u * 0.56,
        o = Math.max(0.54, smoothProfile(openings, x))
      return surface(x, o + v * (1.39 - o), side, 0.009)
    },
    side === 1,
  )
  tube(
    thread,
    Array.from({ length: 26 }, (_, i) => surface(0.9, 0.7 + (i / 25) * 0.61, side, 0.012)),
    0.003,
    30,
  )
  tube(
    trim,
    Array.from({ length: 25 }, (_, i) => surface(0.94, 0.7 + (i / 24) * 0.61, side, 0.012)),
    0.003,
    30,
  )
}

// Dense, subtle knit ribs are actual geometry: no network texture fetches.
for (let row = 0; row < 30; row++) {
  const x = -1.47 + row * 0.053
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 14 }, (_, i) =>
      surface(x + Math.sin((i / 13) * Math.PI) * 0.018, 0.12 + (i / 13) * 0.82, side, 0.003),
    )
    tube(trim, points, 0.0019, 14, false, 3)
  }
}

// Foam midsole: multiple bevel rings, toe spring and continuous heel cup.
const outline = new THREE.CatmullRomCurve3(
  [
    [-1.82, 0, 0],
    [-1.68, 0, -0.36],
    [-1.3, 0, -0.59],
    [-0.68, 0, -0.655],
    [0.05, 0, -0.56],
    [0.73, 0, -0.51],
    [1.3, 0, -0.42],
    [1.52, 0, -0.19],
    [1.55, 0, 0.08],
    [1.36, 0, 0.37],
    [0.81, 0, 0.51],
    [0.1, 0, 0.555],
    [-0.65, 0, 0.655],
    [-1.28, 0, 0.59],
    [-1.68, 0, 0.36],
  ].map((p) => new THREE.Vector3(...p)),
  true,
  'centripetal',
)
const rings = [
  { y: 0.025, s: 0.94 },
  { y: 0.045, s: 0.986 },
  { y: 0.095, s: 1.015 },
  { y: 0.25, s: 1.025 },
  { y: 0.37, s: 1.013 },
  { y: 0.425, s: 0.98 },
]
grid(
  sole,
  120,
  rings.length - 1,
  (u, v) => {
    const q = outline.getPoint(u),
      ring = rings[Math.round(v * (rings.length - 1))]
    return [q.x * ring.s, ring.y + lift(q.x) + Math.max(0, q.x) * 0.018, q.z * ring.s]
  },
  true,
)
const cap = outline
  .getPoints(120)
  .slice(0, -1)
  .map((p) => new THREE.Vector2(p.x * 0.94, p.z * 0.94))
const capTri = THREE.ShapeUtils.triangulateShape(cap, []).flat()
for (const [key, y, reverse] of [
  [tread, 0.026, false],
  [sole, 0.424, true],
]) {
  const geom = new THREE.BufferGeometry()
  geom.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      cap.flatMap((p) => [p.x, y + lift(p.x) + Math.max(0, p.x) * 0.018, p.y]),
      3,
    ),
  )
  geom.setIndex(reverse ? capTri.toReversed() : capTri)
  geom.computeVertexNormals()
  add(key, geom)
}
for (const y of [0.12, 0.31]) {
  tube(
    soleGroove,
    Array.from({ length: 121 }, (_, i) => {
      const p = outline.getPoint(i / 120)
      return [p.x * 1.025, y + lift(p.x) + Math.max(0, p.x) * 0.018, p.z * 1.025]
    }),
    0.0075,
    150,
    true,
    5,
  )
}
// Moulded grooves and segmented rubber traction pieces along both sides.
for (let i = 0; i < 17; i++)
  for (const side of [-1, 1]) {
    const x = -1.48 + i * 0.175
    const w = smoothProfile(widths, Math.max(-1.7, Math.min(1.43, x))) + 0.058
    tube(
      soleGroove,
      [
        [x - 0.026, 0.075 + lift(x), side * w],
        [x, 0.16 + lift(x), side * (w + 0.012)],
        [x + 0.016, 0.23 + lift(x), side * (w + 0.015)],
      ],
      0.006,
      10,
      false,
      4,
    )
  }
for (let i = 0; i < 15; i++) {
  const x = -1.48 + i * 0.19,
    w = Math.max(0.12, smoothProfile(widths, x)) * 0.83
  const g = new THREE.BoxGeometry(0.12, 0.027, w * 2)
  g.translate(x, 0.016 + lift(x), 0)
  add(tread, g)
}

// Padded tongue with a thin rolled perimeter; silhouette is independent of body.
const tongueY = (x) =>
  smoothProfile(heights, Math.min(0.24, x)) + 0.012 - Math.max(0, x - 0.2) * 0.22
const tongueWidth = (x) => 0.225 + ((x + 0.75) / 1.15) * 0.055
for (const offset of [0, -0.04])
  grid(
    tongue,
    50,
    16,
    (u, v) => {
      const x = -0.75 + u * 1.15,
        z = (v * 2 - 1) * tongueWidth(x),
        dome = 0.055 * (1 - (v * 2 - 1) ** 2)
      return [x, tongueY(x) + dome + offset - Math.abs(v * 2 - 1) * 0.065, z]
    },
    offset === 0,
  )
for (const side of [-1, 1])
  tube(
    tongue,
    Array.from({ length: 40 }, (_, i) => {
      const x = -0.75 + (i / 39) * 1.15
      return [x, tongueY(x) - 0.065, side * tongueWidth(x)]
    }),
    0.017,
    45,
    false,
    8,
  )
tube(
  tongue,
  [
    [-0.75, tongueY(-0.75), -0.235],
    [-0.78, tongueY(-0.75) + 0.01, 0],
    [-0.75, tongueY(-0.75), 0.235],
  ],
  0.024,
  20,
  false,
  8,
)
tube(
  tongue,
  [
    [0.4, tongueY(0.4) - 0.065, -0.28],
    [0.43, tongueY(0.4) + 0.055, 0],
    [0.4, tongueY(0.4) - 0.065, 0.28],
  ],
  0.017,
  24,
  false,
  8,
)
// Tongue label and two original small woven bars.
const label = new THREE.BoxGeometry(0.16, 0.018, 0.23)
label.translate(0.32, tongueY(0.32) + 0.055, 0)
add(suede, label)
for (const z of [-0.052, 0.015]) {
  const bar = new THREE.BoxGeometry(0.075, 0.021, 0.018)
  bar.translate(0.32, tongueY(0.32) + 0.067, z)
  add(lace, bar)
}

for (let i = 0; i < 6; i++) {
  const x = -0.65 + i * 0.168,
    w = tongueWidth(x) + 0.015,
    y = tongueY(x) + 0.07
  const endY = (px) =>
    surface(px, Math.asin(Math.min(0.88, w / smoothProfile(widths, px))), 1, 0.012)[1]
  // Flat woven laces retain a round bevel but have a deliberately broad profile.
  for (const direction of [-1, 1]) {
    tube(
      lace,
      [
        [x - 0.035, endY(x - 0.035), -w * direction],
        [x + 0.018, y + 0.012, -w * 0.35 * direction],
        [x + 0.056, y + 0.018, w * 0.36 * direction],
        [x + 0.105, endY(x + 0.105), w * direction],
      ],
      0.021,
      24,
      false,
      8,
    )
  }
  for (const side of [-1, 1]) {
    const g = new THREE.TorusGeometry(0.031, 0.008, 6, 14)
    g.rotateX(Math.PI / 2)
    g.rotateZ(0.5)
    g.translate(x + 0.025, endY(x + 0.025), side * w)
    add(eyelet, g)
    tube(
      suede,
      [
        [x - 0.07, endY(x - 0.07) - 0.015, side * (w + 0.012)],
        [x + 0.1, endY(x + 0.1) - 0.015, side * (w + 0.017)],
      ],
      0.025,
      10,
      false,
      7,
    )
  }
}
// Small loose tie with two loops and aglets, visible from the front angle.
const tieX = 0.255,
  tieY = tongueY(tieX) + 0.078
tube(
  lace,
  [
    [tieX, tieY, 0],
    [tieX + 0.11, tieY + 0.07, -0.2],
    [tieX + 0.19, tieY + 0.015, -0.29],
    [tieX + 0.07, tieY - 0.01, -0.15],
    [tieX, tieY, 0],
  ],
  0.019,
  40,
  false,
  7,
)
tube(
  lace,
  [
    [tieX, tieY, 0],
    [tieX + 0.13, tieY + 0.075, 0.19],
    [tieX + 0.22, tieY + 0.025, 0.29],
    [tieX + 0.08, tieY - 0.01, 0.16],
    [tieX, tieY, 0],
  ],
  0.019,
  40,
  false,
  7,
)
tube(
  lace,
  [
    [tieX, tieY, 0],
    [tieX - 0.07, tieY + 0.015, -0.12],
    [tieX - 0.19, tieY - 0.035, -0.23],
  ],
  0.017,
  22,
  false,
  7,
)
tube(
  lace,
  [
    [tieX, tieY, 0],
    [tieX - 0.13, tieY + 0.018, 0.1],
    [tieX - 0.25, tieY - 0.085, 0.21],
  ],
  0.017,
  22,
  false,
  7,
)

// Rear pull loop and finely outlined collar stitching.
tube(
  suede,
  [
    [1.24, 1.23, -0.09],
    [1.43, 1.42, -0.075],
    [1.44, 1.49, 0],
    [1.43, 1.42, 0.075],
    [1.24, 1.23, 0.09],
  ],
  0.035,
  36,
  false,
  8,
)
for (const side of [-1, 1])
  tube(
    thread,
    Array.from({ length: 46 }, (_, i) => {
      const x = 0.12 + (i / 45) * 1.17
      return surface(x, Math.max(0, smoothProfile(openings, x)) + 0.075, side, 0.015)
    }),
    0.004,
    60,
  )

const root = new THREE.Group()
root.name = 'Atelier_01'
root.userData = {
  description: 'Original unbranded procedural running sneaker',
  generator: 'scripts/generate-model.mjs',
  coordinateSystem: 'Y up, toe -X',
  parts: ['body', 'sole', 'lace', 'tongue'],
}
for (const [key, geometries] of chunks) {
  const g = mergeGeometries(geometries, false)
  // Athletic low-top proportions, preserving the sculpted sole thickness.
  const position = g.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    if (y > 0.43) position.setY(i, 0.43 + (y - 0.43) * 0.76)
  }
  g.computeVertexNormals()
  const m = materials.get(key),
    mesh = new THREE.Mesh(g, m)
  mesh.name = key
  mesh.userData = { part: m.userData.part, shade: m.userData.shade }
  root.add(mesh)
}
root.updateMatrixWorld(true)
const box = new THREE.Box3().setFromObject(root)
const exporter = new GLTFExporter()
const output = await exporter.parseAsync(root, { binary: true, onlyVisible: true })
await fs.mkdir('public/models', { recursive: true })
await fs.writeFile('public/models/shoe.glb', Buffer.from(output))
const triangles = root.children.reduce((s, m) => s + m.geometry.index.count / 3, 0)
console.log(
  JSON.stringify(
    {
      bytes: output.byteLength,
      triangles,
      sourceGeometryCount: [...chunks.values()].reduce((total, list) => total + list.length, 0),
      mergedMeshCount: root.children.length,
      meshes: root.children.map((m) => ({
        name: m.name,
        part: m.userData.part,
        shade: m.userData.shade,
      })),
      bounds: { min: box.min.toArray(), max: box.max.toArray() },
    },
    null,
    2,
  ),
)
