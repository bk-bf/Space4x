const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export const dith = (x: number, y: number): number => (BAYER4[((y & 3) << 2) | (x & 3)]! + 0.5) / 16;

const smooth = (t: number) => t * t * (3 - 2 * t);

const HX = 374761393;
const HY = 668265263;
const HZ = 1274126177;
const UNIT = 1 / 4294967296;

const corner = (n: number) => {
  n = Math.imul(n ^ (n >>> 13), HZ);
  return ((n ^ (n >>> 16)) >>> 0) * UNIT;
};

export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z),
    xf = smooth(x - xi),
    yf = smooth(y - yi),
    zf = smooth(z - zi),
    x0 = Math.imul(xi | 0, HX),
    x1 = Math.imul((xi + 1) | 0, HX),
    y0 = Math.imul(yi | 0, HY),
    y1 = Math.imul((yi + 1) | 0, HY),
    z0 = Math.imul(zi | 0, HZ),
    z1 = Math.imul((zi + 1) | 0, HZ);
  const a = corner(x0 ^ y0 ^ z0),
    b = corner(x1 ^ y0 ^ z0),
    c = corner(x0 ^ y1 ^ z0),
    d = corner(x1 ^ y1 ^ z0),
    e = corner(x0 ^ y0 ^ z1),
    f = corner(x1 ^ y0 ^ z1),
    g = corner(x0 ^ y1 ^ z1),
    h = corner(x1 ^ y1 ^ z1),
    p = a + (b - a) * xf,
    q = c + (d - c) * xf,
    r = e + (f - e) * xf,
    t = g + (h - g) * xf,
    u = p + (q - p) * yf;
  return u + (r + (t - r) * yf - u) * zf;
}

export function fbm(x: number, y: number, z: number, octaves: number): number {
  let a = 0.5,
    f = 1,
    s = 0,
    n = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise3(x * f, y * f, z * f);
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return s / n;
}
