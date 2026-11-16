'use strict';
(() => {
  const { ramp, hsl, strHash, sprite, rnd, mixc } = S4;
  const ALLOYS = new Set(['stainless_steel', 'al_li_alloy', 'ti_6al_4v', 'nickel_superalloy', 'grcop', 'c103', 'haynes_230', 'asteroidal_steel']);
  const INK = [20, 14, 42];

  const COL = {
    iron: [150, 162, 190], nickel: [176, 186, 150], cobalt: [70, 104, 196], aluminium: [204, 214, 230], titanium: [168, 150, 204], lithium: [212, 212, 236],
    copper: [218, 122, 66], chromium: [110, 204, 204], molybdenum: [140, 152, 176], tungsten: [96, 98, 124], vanadium: [150, 192, 108], niobium: [118, 150, 214],
    tin: [204, 204, 190], tantalum: [88, 112, 156], hafnium: [142, 128, 166], zirconium: [184, 172, 138], rhenium: [128, 118, 144], iridium: [200, 222, 234],
    platinum: [224, 228, 240], gold: [238, 192, 70], silver: [224, 228, 236], beryllium: [148, 204, 150], lead: [98, 110, 144], sodium: [232, 202, 160],
    potassium: [214, 168, 194], neodymium: [192, 120, 204], samarium: [172, 172, 118], yttrium: [180, 204, 118], barium: [150, 184, 118], boron: [88, 70, 84],
    fe_ni_metal: [156, 122, 100], calcium: [228, 222, 206],
    stainless_steel: [190, 200, 210], al_li_alloy: [180, 216, 236], ti_6al_4v: [152, 140, 194], nickel_superalloy: [108, 126, 156], grcop: [200, 132, 98],
    c103: [108, 142, 196], haynes_230: [120, 132, 96], asteroidal_steel: [172, 130, 100],
    water: [74, 150, 232], hydrogen: [232, 238, 255], oxygen: [112, 172, 255], nitrogen: [150, 192, 242], helium4: [255, 222, 150], argon: [172, 124, 224],
    krypton: [140, 232, 192], xenon: [124, 164, 255], neon: [255, 124, 92], carbon_dioxide: [182, 182, 194], methane: [192, 204, 150], ammonia: [204, 232, 150],
    sulfur: [238, 222, 70], sulfuric_acid: [222, 202, 60], iodine: [146, 62, 172], comet_ice: [170, 214, 240], carbonaceous_chondrite: [92, 84, 96], air: [192, 218, 238],
    rp1: [200, 140, 70], lox: [100, 160, 250], lh2: [226, 232, 255], lch4: [170, 210, 140], hydrazine: [190, 140, 210], mmh: [210, 150, 120], nto: [230, 120, 70],
    af_m315e: [120, 220, 150], apcp: [180, 180, 190], antihydrogen: [255, 90, 150], metallic_hydrogen: [255, 190, 230],
    meat: [214, 96, 100], wheat: [228, 190, 94], potato: [196, 150, 92], soybean: [204, 196, 112], leafy_greens: [92, 184, 84], single_cell_protein: [206, 176, 126], food_ration: [156, 138, 116],
    silicon: [120, 132, 176], gallium: [170, 200, 230], germanium: [156, 168, 174], indium: [190, 190, 216], arsenic: [130, 130, 120], fluorite: [160, 120, 220],
    electronic_silicon: [110, 124, 186], gaas: [120, 110, 150], ingap: [190, 110, 130], gan: [100, 170, 200], mj_solar_cell: [70, 70, 190], si_solar_cell: [58, 94, 170],
    rad_hard_ic: [150, 150, 170], ai_accelerator: [80, 190, 170], li_ion_cell: [78, 118, 190], ndfeb_magnet: [150, 150, 164], smco_magnet: [170, 140, 170],
    nbti: [120, 150, 200], nb3sn: [150, 130, 210], rebco: [200, 160, 90], rt_superconductor: [255, 180, 255],
    graphite: [92, 90, 108], rcc: [60, 58, 76], pica: [120, 80, 64], cvd_diamond: [180, 236, 255], carbon: [70, 68, 84], carbon_fibre: [58, 62, 96], cfrp: [130, 112, 182], cnt_fibre: [172, 184, 204],
    uranium: [130, 170, 90], haleu: [150, 210, 100], heu: [190, 250, 110], depleted_uranium: [90, 110, 80], thorium: [200, 190, 110], pu238: [255, 140, 90], neptunium237: [210, 150, 230],
    triso: [230, 190, 90], zircaloy: [166, 172, 176], deuterium: [190, 220, 255], tritium: [130, 255, 190], helium3: [255, 200, 120], lithium6: [230, 200, 230],
    lunar_regolith: [140, 138, 146], martian_regolith: [176, 98, 66], basalt: [84, 88, 104], ilmenite: [88, 78, 100], anorthite: [210, 214, 226], ordinary_chondrite: [142, 120, 104],
    fused_silica: [184, 226, 240], silica_aerogel: [196, 214, 240], alumina: [236, 232, 224], boron_carbide: [70, 72, 84], silicon_carbide: [86, 110, 100], ysz: [236, 226, 196],
    uhtc: [100, 88, 120], sintered_regolith: [150, 130, 120], sulfur_concrete: [190, 176, 100], nextel: [230, 200, 150], basalt_fibre: [116, 110, 130], glass_fibre: [200, 226, 236], bnnt: [230, 230, 244],
    exotic_matter: [200, 80, 255], compute: [95, 208, 197], ai_models: [242, 179, 93],
    phosphorus: [220, 120, 90], zeolite: [220, 210, 190], lioh: [236, 236, 244], amine_sorbent: [210, 190, 150], plant_biomass: [96, 190, 90], spirulina: [60, 170, 140],
    phosphoric_acid: [220, 190, 110], map_fertiliser: [220, 170, 130], urea: [236, 236, 230], potassium_sulfate: [226, 200, 214],
    ethylene: [180, 220, 190], polyimide: [226, 156, 62], pet_film: [180, 210, 232], aramid: [236, 206, 70], vectran: [226, 190, 120], uhmwpe: [226, 234, 240], ptfe: [240, 240, 244],
    silicone: [180, 120, 120], epoxy: [210, 170, 90], phenolic_resin: [166, 90, 66], pan: [200, 200, 220]
  };
  const BAND = { metal: [.35, .62], nuclear: [.55, .5], semiconductor_electronics: [.45, .56], ceramic: [.3, .58], volatile: [.5, .66], propellant: [.6, .56], polymer: [.55, .6], carbon_materials: [.1, .3], food: [.55, .6], fertiliser: [.45, .56], bio_life_support: [.5, .52], computation: [.6, .6], exotic: [.8, .6] };

  const CODES = {
    iron: 'FE', nickel: 'NI', cobalt: 'CO', aluminium: 'AL', titanium: 'TI', lithium: 'LI', copper: 'CU', chromium: 'CR', molybdenum: 'MO', tungsten: 'W', vanadium: 'V', niobium: 'NB',
    tin: 'SN', tantalum: 'TA', hafnium: 'HF', zirconium: 'ZR', rhenium: 'RE', iridium: 'IR', platinum: 'PT', gold: 'AU', silver: 'AG', beryllium: 'BE', lead: 'PB', sodium: 'NA',
    potassium: 'K', neodymium: 'ND', samarium: 'SM', yttrium: 'Y', barium: 'BA', boron: 'B', calcium: 'CA', fe_ni_metal: 'FN',
    stainless_steel: 'SS', al_li_alloy: 'LA', ti_6al_4v: 'T6', nickel_superalloy: 'IN', grcop: 'GR', c103: 'C1', haynes_230: 'HY', asteroidal_steel: 'AS',
    hydrogen: 'H2', oxygen: 'O2', nitrogen: 'N2', helium4: 'HE', argon: 'AR', krypton: 'KR', xenon: 'XE', neon: 'NE', carbon_dioxide: 'C2', methane: 'CH', ammonia: 'N3', air: 'AI', water: 'H2',
    rp1: 'RP', lox: 'LO', lh2: 'LH', lch4: 'LC', hydrazine: 'HZ', mmh: 'MM', nto: 'NT', af_m315e: 'AF', apcp: 'AP',
    wheat: 'WH', potato: 'PO', soybean: 'SO', deuterium: 'D', tritium: 'T', helium3: 'H3', lithium6: 'L6', ethylene: 'C2'
  };

  function shapeOf(m) {
    const id = m.id, c = m.category;
    if (id === 'exotic_matter' || id === 'antihydrogen' || id === 'metallic_hydrogen' || id === 'rt_superconductor') return 'orb';
    if (id === 'compute') return 'rack';
    if (id === 'ai_models') return 'core';
    if (c === 'metal') return 'ingot';
    if (c === 'nuclear') return ['deuterium', 'tritium', 'helium3'].includes(id) ? 'canister' : id === 'zircaloy' ? 'ingot' : 'rods';
    if (c === 'semiconductor_electronics') {
      if (id.includes('cell') && id !== 'li_ion_cell') return 'cell';
      if (id === 'li_ion_cell') return 'battery';
      if (id === 'rad_hard_ic' || id === 'ai_accelerator') return 'chip';
      if (id.includes('magnet')) return 'magnet';
      if (['nbti', 'nb3sn', 'rebco'].includes(id)) return 'roll';
      if (['electronic_silicon', 'gaas', 'ingap', 'gan'].includes(id)) return 'wafer';
      if (id === 'neon') return 'canister';
      return 'crystal';
    }
    if (c === 'ceramic') {
      if (['lunar_regolith', 'martian_regolith', 'ilmenite', 'anorthite', 'basalt', 'ordinary_chondrite', 'sintered_regolith', 'sulfur_concrete'].includes(id)) return 'rock';
      if (['basalt_fibre', 'glass_fibre', 'nextel', 'bnnt'].includes(id)) return 'roll';
      if (['fused_silica', 'silica_aerogel'].includes(id)) return 'crystal';
      return 'brick';
    }
    if (c === 'volatile') {
      if (id === 'water' || id === 'comet_ice') return 'ice';
      if (id === 'sulfur') return 'pile';
      if (id === 'sulfuric_acid') return 'flask';
      if (id === 'iodine') return 'crystal';
      if (id === 'carbonaceous_chondrite') return 'rock';
      return 'canister';
    }
    if (c === 'propellant') return 'drum';
    if (c === 'polymer') return id === 'ethylene' ? 'canister' : 'roll';
    if (c === 'carbon_materials') {
      if (['carbon_fibre', 'cfrp', 'cnt_fibre'].includes(id)) return 'weave';
      if (id === 'cvd_diamond') return 'crystal';
      if (id === 'pica' || id === 'rcc') return 'brick';
      return 'rock';
    }
    if (c === 'food') return id === 'meat' ? 'steak' : id === 'leafy_greens' ? 'leaf' : id === 'potato' ? 'rock' : id === 'single_cell_protein' ? 'pile' : id === 'food_ration' ? 'crate' : 'sack';
    if (c === 'fertiliser') return id === 'phosphoric_acid' ? 'flask' : 'pile';
    if (c === 'bio_life_support') return { plant_biomass: 'leaf', spirulina: 'flask', zeolite: 'rock', phosphorus: 'pile' }[id] || 'pile';
    return 'orb';
  }

  const SHAPE_NAMES = { ingot: 'ingot', canister: 'gas canister', drum: 'fuel drum', roll: 'roll', sack: 'sack', pile: 'granules', leaf: 'leaf', flask: 'flask', crystal: 'crystal', wafer: 'wafer', chip: 'chip', cell: 'solar cell', magnet: 'magnet', battery: 'cell', brick: 'ceramic block', rock: 'rock', rods: 'shielded fuel', weave: 'woven plate', ice: 'ice', crate: 'crate', steak: 'cut of meat', rack: 'rack', core: 'model core', orb: 'orb' };

  const info = {};
  function build(mats) {
    const per = {};
    for (const m of mats) {
      const idx = per[m.category] = (per[m.category] || 0) + 1;
      let base = COL[m.id];
      if (!base) {
        const [s, l] = BAND[m.category] || [.5, .55];
        base = hsl((idx * 137.5 + strHash(m.id) * 40) % 360, s, l);
      }
      const shape = shapeOf(m);
      info[m.id] = { id: m.id, base, R: ramp(base), shape, code: CODES[m.id] || '', short: m.name.split(' (')[0] };
    }
    const used = new Set(Object.values(info).map(i => i.shape + ':' + i.code).filter(s => !s.endsWith(':')));
    for (const m of mats) {
      const i = info[m.id];
      if (i.code) continue;
      const words = m.name.replace(/\(.*\)/, '').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
      const L = m.name.replace(/\(.*\)/, '').replace(/[^A-Za-z]/g, '').toUpperCase();
      const cands = [];
      if (words.length > 1) cands.push((words[0][0] + words[1][0]).toUpperCase());
      cands.push(L.slice(0, 2));
      for (let k = 2; k < L.length; k++) cands.push(L[0] + L[k]);
      for (let k = 1; k < L.length; k++) cands.push(L[k] + L[(k + 1) % L.length]);
      i.code = cands.find(c => c.length === 2 && !used.has(i.shape + ':' + c)) || cands[0];
      used.add(i.shape + ':' + i.code);
    }
  }

  function codeText(im, code, x, y, c = INK) {
    const w = code.length * 4 - 1;
    im.text(code, x - (w >> 1), y, c);
  }

  const DRAW = {
    ingot(im, I) {
      const R = I.R, alloy = ALLOYS.has(I.id);
      im.rect(1, 7, 10, 6, R.l);
      for (let y = 4; y <= 6; y++) im.rect(1 + (7 - y), y, 10, 1, R.l);
      im.rect(1, 7, 10, 1, R.h);
      for (let k = 1; k <= 3; k++) im.rect(10 + k, 7 - k, 1, 6, k === 1 ? R.d : R.d);
      im.rect(10, 7, 1, 6, R.d);
      im.rect(1, 12, 10, 1, R.d);
      if (alloy) for (let y = 8; y < 12; y++) for (let x = 1; x < 10; x++) if ((x + y) % 4 === 0) im.set(x, y, R.m);
      codeText(im, I.code, 5.5 + (I.code.length === 1 ? 1 : 0), 8, I.R.o);
    },
    canister(im, I) {
      const R = I.R;
      im.cylV(4, 5, 8, 9, R);
      im.rect(5, 4, 6, 1, R.l); im.rect(6, 3, 4, 1, R.m);
      im.rect(7, 1, 2, 3, [150, 152, 176]);
      im.rect(5, 1, 6, 1, [200, 202, 222]);
      im.rect(4, 6, 8, 1, R.d);
      im.rect(4, 13, 8, 1, R.d);
      im.rect(5, 7, 6, 5, mixc(R.m, [236, 226, 196], .78));
      codeText(im, I.code, 8, 8, INK);
    },
    drum(im, I) {
      const R = I.R;
      im.cylV(3, 3, 10, 11, R);
      im.rect(3, 3, 10, 1, R.h); im.rect(4, 2, 8, 1, R.l);
      im.rect(3, 5, 10, 1, R.d); im.rect(3, 12, 10, 1, R.d);
      im.rect(4, 7, 8, 4, mixc(R.m, [236, 226, 196], .78));
      if (/^l/.test(I.id)) for (let i = 0; i < 9; i++) im.set(3 + (i * 5) % 10, 3 + (i * 3) % 3, [236, 248, 255]);
      codeText(im, I.code, 8, 8, INK);
    },
    roll(im, I) {
      const R = I.R, cx = 7.5, cy = 7.5;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
        if (d > 6.5) continue;
        if (d < 1.8) { im.set(x, y, [14, 10, 30]); continue; }
        const ring = Math.floor((d - 1.8) / 1.2) % 2, lit = dx + dy < 0;
        im.set(x, y, ring ? (lit ? R.m : R.d) : (lit ? R.h : R.l));
      }
      im.rect(8, 13, 6, 2, R.l); im.rect(8, 14, 6, 1, R.m);
    },
    sack(im, I) {
      const R = I.R;
      im.poly([[4, 5], [11, 5], [13, 8], [12.6, 14], [3.4, 14], [2.4, 8]], (x, y) => { const t = (x - 2.4) / 11; return t < .22 ? R.l : t < .5 ? R.m : t < .8 ? R.m : R.d; });
      im.rect(6, 2, 4, 3, R.m); im.rect(5, 1, 2, 2, R.l); im.rect(9, 1, 2, 2, R.m);
      im.rect(5, 4, 6, 1, R.d);
      im.rect(4, 8, 8, 5, [236, 226, 196]);
      codeText(im, I.code, 8, 9, INK);
    },
    steak(im, I) {
      const R = I.R;
      im.poly([[2, 8], [4, 4], [9, 3], [13, 5], [14, 9], [12, 13], [7, 14], [3, 12]], (x, y) => y < 6 ? R.l : x > 11 ? R.d : R.m);
      im.poly([[4, 8], [6, 5.5], [10, 5.5], [12, 8], [10, 11], [6, 11]], [236, 168, 164]);
      for (const [x, y] of [[6, 7], [9, 8], [7, 10], [10, 6]]) im.set(x, y, [250, 214, 208]);
      im.rect(11, 2, 2, 2, [240, 232, 214]); im.rect(10, 3, 1, 1, [240, 232, 214]); im.rect(13, 1, 1, 2, [240, 232, 214]);
    },
    pile(im, I) {
      const R = I.R;
      im.poly([[1, 14], [3, 11], [6, 6], [8, 4], [10, 7], [13, 11], [14.5, 14]], (x, y) => {
        const h = S4.strHash(I.id + x + ',' + y);
        return h < .18 ? R.d : h < .42 ? R.l : h < .5 ? R.h : R.m;
      });
      im.rect(1, 14, 14, 1, R.d);
    },
    leaf(im, I) {
      const R = I.R;
      const lf = (cx, cy, rx, ry, a) => {
        const ca = Math.cos(a), sa = Math.sin(a);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const dx = x + .5 - cx, dy = y + .5 - cy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
          if ((u / rx) ** 2 + (v / ry) ** 2 > 1) continue;
          im.set(x, y, Math.abs(v) < .55 ? R.d : v < 0 ? R.l : R.m);
        }
      };
      lf(8, 7, 7, 3.4, -.8);
      lf(6, 9, 5, 2.4, -2.3);
      im.line(2, 13, 6, 9, R.d);
    },
    flask(im, I) {
      const R = I.R, glass = [190, 226, 244];
      im.poly([[6, 2], [10, 2], [10, 6], [14, 14], [2, 14], [6, 6]], glass);
      im.poly([[4.8, 9], [11.2, 9], [14, 14], [2, 14]], R.m);
      im.rect(3, 12, 10, 2, R.d);
      im.rect(5, 1, 6, 1, [236, 246, 255]);
      im.set(6, 11, R.h); im.set(9, 10, R.h); im.set(8, 12, R.l);
      im.line(7, 3, 7, 5, [236, 246, 255]);
    },
    crystal(im, I) {
      const R = I.R;
      const prism = (cx, top, bot, w) => {
        im.poly([[cx, top], [cx + w, top + w * .8], [cx + w, bot - w * .7], [cx, bot], [cx - w, bot - w * .7], [cx - w, top + w * .8]], (x) => x < cx - w * .35 ? R.l : x < cx + w * .3 ? R.m : R.d);
        im.line(cx - w * .5, top + w, cx - w * .5, bot - w, R.h);
      };
      prism(10.5, 5, 14, 3);
      prism(4.5, 8, 14, 2.4);
      prism(8, 1, 14, 3.4);
    },
    wafer(im, I) {
      const R = I.R, cx = 7.5, cy = 7.5;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
        if (d > 6.6 || y > 13) continue;
        let c = d > 5.6 ? R.l : (x % 3 === 0 || y % 3 === 0) ? R.d : (dx + dy < -2 ? R.h : R.m);
        im.set(x, y, c);
      }
      im.rect(5, 14, 6, 1, R.d);
    },
    chip(im, I) {
      const R = I.R, pin = [208, 208, 224];
      im.rect(3, 3, 10, 10, mixc(R.d, [20, 20, 40], .5));
      im.rect(3, 3, 10, 1, R.m); im.rect(3, 3, 1, 10, R.m);
      for (let k = 0; k < 4; k++) { im.rect(1, 4 + k * 2.2, 2, 1, pin); im.rect(13, 4 + k * 2.2, 2, 1, pin); im.rect(4 + k * 2.2, 1, 1, 2, pin); im.rect(4 + k * 2.2, 13, 1, 2, pin); }
      im.rect(5, 5, 6, 6, R.d); im.rect(6, 6, 4, 4, R.m); im.rect(7, 7, 2, 2, R.h);
      im.set(4, 4, R.h);
    },
    cell(im, I) {
      const R = I.R;
      im.rect(1, 3, 14, 10, R.d);
      for (let y = 3; y < 13; y++) for (let x = 1; x < 15; x++) im.set(x, y, (x % 4 === 1 || y % 4 === 3) ? R.d : ((x + y) % 7 === 0 ? R.h : x + y < 12 ? R.l : R.m));
      im.rect(1, 3, 14, 1, R.h);
      im.rect(1, 12, 14, 1, mixc(R.d, [0, 0, 0], .3));
    },
    magnet(im, I) {
      const R = I.R, cx = 7.5, cy = 9;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
        if (d > 6.5 || d < 2.8 || (dy < -1 && Math.abs(dx) < 3.2)) continue;
        let c = dx + dy < 0 ? R.l : R.m;
        if (d > 5.6) c = R.d;
        if (dy < 0.5 && dx < 0) c = d > 5.6 ? [150, 40, 50] : [226, 70, 70];
        if (dy < 0.5 && dx > 0) c = d > 5.6 ? [40, 60, 150] : [90, 130, 236];
        im.set(x, y, c);
      }
    },
    battery(im, I) {
      const R = I.R;
      im.cylV(4, 3, 8, 11, R);
      im.rect(6, 1, 4, 2, [214, 216, 230]);
      im.rect(4, 3, 8, 1, [214, 216, 230]);
      im.rect(4, 5, 8, 7, [236, 226, 196]);
      im.rect(7, 6, 2, 5, R.d); im.rect(6, 8, 4, 1, R.d);
    },
    brick(im, I) {
      const R = I.R, h = (x, y) => S4.strHash(I.id + x + y);
      const b = (x, y, w) => { im.box(x, y, w, 4, R); for (let i = 0; i < 2; i++) im.set(x + 1 + Math.floor(h(x, y + i) * (w - 2)), y + 1 + i, h(x + i, y) > .5 ? R.l : R.d); };
      b(1, 2, 7); b(9, 2, 6); b(1, 7, 3); b(5, 7, 7); b(13, 7, 2); b(1, 12, 7); b(9, 12, 6);
    },
    rock(im, I) {
      const R = I.R, seed = S4.strHash(I.id);
      const blob = (cx, cy, r) => {
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const dx = x + .5 - cx, dy = y + .5 - cy, a = Math.atan2(dy, dx), rr = r * (.78 + .28 * Math.sin(a * 3 + seed * 9) * Math.cos(a * 2 + seed * 5));
          if (Math.hypot(dx, dy) > rr) continue;
          const L = (-dx - dy) / r, hh = S4.strHash(I.id + x + ',' + y);
          im.set(x, y, hh < .12 ? R.d : L > .5 ? R.l : L > -.2 ? R.m : R.d);
        }
      };
      blob(9, 8, 5.8); blob(4.6, 11.4, 3.6);
    },
    rods(im, I) {
      const R = I.R, g = ramp([112, 116, 134]);
      im.cylV(3, 3, 10, 11, g);
      im.rect(3, 3, 10, 2, [236, 190, 60]);
      for (let x = 3; x < 13; x += 2) im.rect(x, 3, 1, 2, [34, 28, 40]);
      im.rect(3, 13, 10, 1, g.d);
      im.rect(4, 5, 8, 3, R.d); im.rect(5, 6, 6, 1, R.m); im.rect(6, 6, 4, 1, R.h);
      codeText(im, I.code, 8, 9, INK);
    },
    weave(im, I) {
      const R = I.R;
      im.rect(1, 4, 14, 8, R.m);
      for (let y = 4; y < 12; y++) for (let x = 1; x < 15; x++) im.set(x, y, (((x >> 1) + (y >> 1)) & 1) ? R.d : R.m);
      im.rect(1, 4, 14, 1, R.l);
      im.rect(1, 12, 14, 2, R.d);
      for (let x = 1; x < 15; x += 2) im.set(x, 12, mixc(R.d, [0, 0, 0], .2));
    },
    ice(im, I) {
      const R = I.R;
      im.poly([[3, 3], [12, 3], [14, 5], [14, 12], [12, 14], [3, 14], [1, 12], [1, 5]], (x, y) => x + y < 11 ? R.l : x + y < 20 ? R.m : R.d);
      im.line(4, 5, 4, 8, R.h); im.line(5, 4, 8, 4, R.h);
      im.set(10, 9, R.h); im.set(9, 10, R.h); im.set(11, 7, R.h);
      im.rect(1, 12, 14, 1, R.d);
    },
    crate(im, I) {
      const R = I.R;
      im.box(1, 3, 14, 11, R);
      im.line(2, 4, 13, 12, R.d); im.line(13, 4, 2, 12, R.d);
      im.rect(1, 3, 14, 1, R.h);
    },
    rack(im, I) {
      const R = I.R, g = ramp([62, 62, 90]);
      im.box(2, 1, 12, 14, g);
      for (let k = 0; k < 4; k++) {
        im.rect(3, 2 + k * 3, 10, 2, [30, 28, 48]);
        im.set(4, 2 + k * 3, R.h); im.set(6, 3 + k * 3, k % 2 ? [242, 179, 93] : R.m); im.rect(8, 2 + k * 3, 4, 1, [70, 70, 100]);
      }
    },
    core(im, I) {
      const R = I.R;
      im.sphere(7.5, 7.5, 6.4, R);
      const pts = [[5, 5], [10, 4], [11, 9], [6, 11], [8, 8]];
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if ((i + j) % 2 === 0) im.line(pts[i][0], pts[i][1], pts[j][0], pts[j][1], R.h);
      for (const p of pts) { im.set(p[0], p[1], [255, 255, 255]); }
    },
    orb(im, I) {
      const R = I.R;
      im.sphere(7.5, 7.5, 5.6, R);
      for (let a = 0; a < 6.3; a += .22) { const x = 7.5 + Math.cos(a) * 7, y = 7.5 + Math.sin(a) * 2.7; if (Math.sin(a) > -.3) im.set(x, y + (a < 3.1 ? -.4 : 0), a % .88 < .44 ? R.h : R.l); }
      im.set(5, 5, [255, 255, 255]);
    }
  };

  function matIcon(id) {
    const I = info[id];
    if (!I) return '';
    return sprite('m:' + id, 16, 16, im => DRAW[I.shape](im, I));
  }

  Object.assign(S4, { buildMats: build, matInfo: id => info[id], matIcon, SHAPE_NAMES });
})();
