import type { Color } from '../icons/pixels.ts';

export type Pt = readonly [number, number];
export type Pts = readonly Pt[];
export type Ramp3 = readonly [Color, Color, Color];
export type Ramp4 = readonly [Color, Color, Color, Color];

export type Gender = 'm' | 'f';
export type Branch = 'staff' | 'ground' | 'governor';
export type PortraitStyle = 'gritty' | 'clean';

export const PORTRAIT_W = 64;
export const PORTRAIT_H = 72;
export const HEAD_W = 32;
export const HEAD_H = 36;
export const HEAD_X = 15;
export const HEAD_Y = 14;

export const SKIN: readonly Ramp4[] = [
  [
    [255, 232, 214],
    [244, 206, 180],
    [206, 152, 134],
    [140, 88, 88]
  ],
  [
    [250, 214, 184],
    [232, 184, 150],
    [190, 132, 110],
    [124, 76, 74]
  ],
  [
    [236, 190, 150],
    [212, 158, 116],
    [166, 110, 84],
    [106, 64, 60]
  ],
  [
    [204, 150, 108],
    [174, 116, 78],
    [130, 80, 58],
    [80, 48, 46]
  ],
  [
    [164, 112, 80],
    [132, 84, 58],
    [96, 58, 46],
    [58, 34, 36]
  ],
  [
    [124, 86, 66],
    [96, 62, 48],
    [68, 42, 38],
    [40, 24, 30]
  ]
];

export const HAIR: readonly Ramp4[] = [
  [
    [78, 74, 104],
    [42, 38, 60],
    [26, 22, 40],
    [14, 10, 24]
  ],
  [
    [118, 82, 62],
    [82, 54, 44],
    [56, 36, 36],
    [32, 20, 28]
  ],
  [
    [160, 112, 72],
    [122, 80, 52],
    [86, 54, 42],
    [50, 30, 30]
  ],
  [
    [204, 110, 70],
    [166, 76, 50],
    [118, 50, 44],
    [70, 28, 34]
  ],
  [
    [246, 220, 140],
    [220, 184, 104],
    [174, 134, 78],
    [112, 80, 56]
  ],
  [
    [240, 150, 80],
    [208, 112, 56],
    [156, 76, 46],
    [94, 44, 36]
  ]
];

export const GREY: readonly [Ramp4, Ramp4] = [
  [
    [214, 216, 226],
    [170, 172, 188],
    [122, 124, 146],
    [74, 74, 98]
  ],
  [
    [248, 248, 252],
    [220, 222, 234],
    [170, 174, 196],
    [108, 110, 138]
  ]
];

export const EYE: readonly Color[] = [
  [120, 74, 44],
  [64, 44, 40],
  [84, 140, 212],
  [92, 160, 110],
  [140, 152, 170],
  [160, 124, 60],
  [214, 150, 50],
  [150, 200, 240],
  [56, 110, 80],
  [150, 110, 210]
];

export const BACKDROPS: readonly Ramp3[] = [
  [
    [18, 16, 44],
    [30, 26, 66],
    [48, 42, 100]
  ],
  [
    [14, 24, 44],
    [24, 40, 66],
    [38, 64, 96]
  ],
  [
    [30, 16, 44],
    [48, 28, 64],
    [74, 44, 92]
  ],
  [
    [14, 28, 34],
    [24, 46, 52],
    [40, 72, 78]
  ]
];

export const UNIFORM: Record<Branch, Ramp4> = {
  staff: [
    [84, 104, 176],
    [48, 62, 124],
    [30, 40, 86],
    [16, 20, 48]
  ],
  ground: [
    [128, 142, 96],
    [88, 102, 66],
    [58, 70, 48],
    [30, 38, 32]
  ],
  governor: [
    [108, 108, 134],
    [70, 70, 96],
    [46, 46, 68],
    [24, 24, 40]
  ]
};

export const GOLD: Ramp3 = [
  [255, 226, 150],
  [242, 184, 92],
  [176, 120, 52]
];

export const CAP_WHITE: Ramp4 = [
  [236, 238, 246],
  [204, 208, 226],
  [154, 158, 188],
  [66, 68, 98]
];

export const CAP_BAND: Ramp4 = [
  [70, 74, 110],
  [34, 36, 60],
  [20, 20, 38],
  [10, 8, 22]
];

export const RIBBONS: readonly Color[] = [
  [214, 80, 76],
  [90, 160, 226],
  [246, 196, 96],
  [100, 196, 130],
  [236, 236, 246],
  [170, 110, 220]
];

const CROP: Pts = [
  [16, 22],
  [17, 14],
  [22, 8],
  [31, 6],
  [40, 7],
  [45, 12],
  [46, 18],
  [44, 16],
  [39, 13],
  [31, 13],
  [25, 15],
  [22, 20],
  [21, 25],
  [18, 26]
];

const TIGHT: Pts = [
  [16, 22],
  [17, 13],
  [23, 8],
  [31, 7],
  [40, 8],
  [45, 13],
  [45, 17],
  [42, 15],
  [37, 13],
  [30, 13],
  [24, 15],
  [21, 21],
  [19, 25]
];

const LONG_FRONT: Pts = [
  [15, 26],
  [15, 14],
  [21, 7],
  [31, 5],
  [41, 6],
  [46, 12],
  [47, 19],
  [44, 17],
  [39, 13],
  [33, 11],
  [27, 13],
  [23, 18],
  [21, 27],
  [19, 34],
  [16, 34]
];

const LONG_BACK: readonly Pts[] = [
  [
    [12, 16],
    [18, 10],
    [21, 30],
    [22, 44],
    [21, 57],
    [8, 59],
    [7, 36]
  ],
  [
    [44, 15],
    [48, 24],
    [49, 40],
    [47, 52],
    [42, 52],
    [43, 40],
    [45, 30]
  ]
];

export type Disc = readonly [number, number, number];

export interface HairShape {
  genders: string;
  name: string;
  front?: readonly Pts[];
  back?: readonly Pts[];
  buzz?: readonly Pts[];
  lines?: readonly (readonly [number, number, number, number])[];
  discs?: readonly Disc[];
  backDiscs?: readonly Disc[];
  curly?: boolean;
  afro?: boolean;
  braid?: boolean;
  locs?: boolean;
  shine?: boolean;
}

export const HAIRS = {
  crop: { genders: 'm', name: 'Crop', front: [CROP] },
  buzz: {
    genders: 'mf',
    name: 'Buzz cut',
    buzz: [
      [
        [17, 21],
        [18, 14],
        [23, 9],
        [31, 8],
        [39, 9],
        [44, 13],
        [45, 17],
        [43, 16],
        [38, 13],
        [31, 13],
        [25, 15],
        [22, 20],
        [20, 24],
        [18, 24]
      ]
    ]
  },
  spiky: {
    genders: 'm',
    name: 'Spiky',
    front: [
      [
        [16, 22],
        [17, 14],
        [20, 9],
        [22, 5],
        [25, 8],
        [28, 3],
        [31, 7],
        [34, 2],
        [37, 6],
        [40, 3],
        [42, 8],
        [46, 8],
        [45, 13],
        [46, 18],
        [44, 16],
        [39, 13],
        [31, 13],
        [25, 15],
        [22, 20],
        [21, 25],
        [18, 26]
      ]
    ]
  },
  quiff: {
    genders: 'm',
    name: 'Quiff',
    front: [
      [
        [16, 22],
        [17, 14],
        [21, 8],
        [28, 4],
        [36, 1],
        [44, 2],
        [49, 7],
        [48, 13],
        [46, 17],
        [44, 14],
        [40, 12],
        [33, 12],
        [26, 14],
        [22, 19],
        [21, 25],
        [18, 26]
      ]
    ]
  },
  part: {
    genders: 'mf',
    name: 'Side part',
    front: [
      [
        [16, 23],
        [16, 14],
        [21, 7],
        [31, 5],
        [41, 6],
        [46, 11],
        [47, 19],
        [45, 21],
        [42, 17],
        [36, 14],
        [29, 15],
        [24, 13],
        [22, 19],
        [21, 25],
        [18, 27]
      ]
    ],
    lines: [[25, 7, 24, 13]]
  },
  undercut: {
    genders: 'mf',
    name: 'Undercut',
    front: [
      [
        [19, 16],
        [21, 8],
        [30, 4],
        [41, 5],
        [47, 11],
        [46, 17],
        [43, 15],
        [38, 12],
        [31, 12],
        [25, 14],
        [22, 18]
      ]
    ],
    buzz: [
      [
        [17, 16],
        [21, 16],
        [22, 21],
        [21, 26],
        [17, 26]
      ]
    ]
  },
  slick: {
    genders: 'm',
    name: 'Slicked back',
    front: [
      [
        [16, 24],
        [16, 14],
        [21, 7],
        [31, 5],
        [41, 6],
        [46, 12],
        [46, 17],
        [43, 14],
        [37, 11],
        [30, 11],
        [24, 13],
        [21, 18],
        [20, 26],
        [17, 28]
      ]
    ],
    back: [
      [
        [13, 18],
        [18, 13],
        [19, 30],
        [21, 37],
        [15, 39],
        [12, 30]
      ]
    ]
  },
  mohawk: {
    genders: 'm',
    name: 'Mohawk',
    front: [
      [
        [24, 12],
        [25, 5],
        [31, 2],
        [38, 3],
        [42, 7],
        [43, 13],
        [39, 11],
        [32, 10],
        [27, 11]
      ]
    ],
    buzz: [
      [
        [17, 20],
        [18, 14],
        [22, 10],
        [25, 10],
        [25, 14],
        [22, 19],
        [21, 25],
        [18, 25]
      ],
      [
        [40, 11],
        [44, 14],
        [45, 18],
        [42, 15]
      ]
    ]
  },
  receding: {
    genders: 'm',
    name: 'Receding',
    front: [
      [
        [16, 22],
        [17, 14],
        [22, 8],
        [31, 6],
        [40, 7],
        [45, 12],
        [46, 17],
        [44, 14],
        [40, 10],
        [34, 9],
        [29, 10],
        [27, 13],
        [24, 12],
        [22, 18],
        [21, 25],
        [18, 26]
      ]
    ]
  },
  horseshoe: {
    genders: 'm',
    name: 'Bald on top',
    front: [
      [
        [16, 25],
        [16, 17],
        [18, 15],
        [21, 18],
        [21, 26],
        [18, 28]
      ],
      [
        [44, 16],
        [46, 18],
        [46, 22],
        [44, 20]
      ]
    ],
    shine: true
  },
  bald: { genders: 'm', name: 'Bald', shine: true },
  curls: {
    genders: 'mf',
    name: 'Short curls',
    front: [CROP],
    discs: [
      [18, 16, 3.2],
      [20, 11, 3.2],
      [24, 8, 3.2],
      [29, 6, 3.2],
      [34, 6, 3.2],
      [39, 7, 3.2],
      [43, 10, 3.2],
      [45, 14, 3],
      [18, 21, 3],
      [46, 18, 2.4]
    ],
    curly: true
  },
  afro: { genders: 'mf', name: 'Afro', afro: true, curly: true },
  pixie: {
    genders: 'f',
    name: 'Pixie',
    front: [
      [
        [15, 25],
        [15, 14],
        [20, 7],
        [30, 5],
        [40, 6],
        [46, 11],
        [47, 17],
        [44, 18],
        [41, 15],
        [35, 14],
        [30, 17],
        [25, 15],
        [22, 21],
        [21, 28],
        [17, 30]
      ]
    ]
  },
  bob: {
    genders: 'f',
    name: 'Bob',
    front: [
      [
        [15, 24],
        [15, 14],
        [20, 7],
        [30, 5],
        [41, 6],
        [47, 12],
        [48, 19],
        [45, 19],
        [43, 16],
        [37, 14],
        [30, 15],
        [25, 15],
        [22, 19],
        [21, 27],
        [20, 40],
        [15, 42],
        [13, 32]
      ]
    ],
    back: [
      [
        [45, 13],
        [49, 20],
        [50, 38],
        [46, 42],
        [44, 36],
        [45, 28]
      ],
      [
        [11, 20],
        [17, 12],
        [20, 41],
        [13, 43]
      ]
    ]
  },
  long: { genders: 'f', name: 'Long', front: [LONG_FRONT], back: LONG_BACK },
  wavy: {
    genders: 'f',
    name: 'Long wavy',
    front: [LONG_FRONT],
    back: LONG_BACK,
    backDiscs: [
      [8, 28, 3],
      [7, 38, 3],
      [8, 48, 3],
      [9, 56, 3],
      [49, 28, 2.6],
      [50, 38, 2.6],
      [48, 48, 2.6]
    ],
    curly: true
  },
  tail: {
    genders: 'mf',
    name: 'Ponytail',
    front: [TIGHT],
    back: [
      [
        [10, 15],
        [15, 13],
        [18, 17],
        [18, 24],
        [14, 26],
        [10, 22]
      ],
      [
        [9, 22],
        [14, 23],
        [14, 34],
        [12, 46],
        [8, 44],
        [8, 30]
      ]
    ]
  },
  bun: { genders: 'f', name: 'Bun', front: [TIGHT], backDiscs: [[15, 10, 5.2]] },
  braid: { genders: 'f', name: 'Braid', front: [TIGHT], braid: true },
  locs: { genders: 'mf', name: 'Locs', front: [LONG_FRONT], back: LONG_BACK, locs: true }
} as const satisfies Record<string, HairShape>;

export type HairId = keyof typeof HAIRS;

export interface BeardShape {
  name: string;
  polys?: readonly Pts[];
  gap?: boolean;
  over?: boolean;
  strap?: boolean;
}

export const BEARDS = {
  none: { name: 'Clean shaven' },
  shadow: { name: "Five o'clock shadow" },
  stubble: { name: 'Stubble' },
  mustache: {
    name: 'Moustache',
    polys: [
      [
        [30, 37.5],
        [35, 37],
        [40, 37.5],
        [41, 40],
        [36, 39],
        [31, 40]
      ]
    ]
  },
  handlebar: {
    name: 'Handlebar',
    polys: [
      [
        [29, 37.5],
        [35, 37],
        [41, 37.5],
        [43, 36],
        [44, 38.5],
        [41, 41],
        [36, 39],
        [31, 41],
        [28, 39.5],
        [27, 37]
      ]
    ]
  },
  soul: {
    name: 'Soul patch',
    polys: [
      [
        [34, 42.5],
        [37, 42.5],
        [36.5, 46],
        [34.5, 46]
      ]
    ]
  },
  goatee: {
    name: 'Goatee',
    polys: [
      [
        [30, 37.5],
        [39, 37.5],
        [40, 43],
        [38, 48],
        [32, 48],
        [30, 44]
      ]
    ],
    gap: true
  },
  vandyke: {
    name: 'Van Dyke',
    polys: [
      [
        [30, 37.5],
        [35, 37],
        [40, 37.5],
        [41, 40],
        [36, 39],
        [31, 40]
      ],
      [
        [32, 43.5],
        [38, 43.5],
        [37, 50],
        [33, 50]
      ]
    ]
  },
  chops: {
    name: 'Mutton chops',
    polys: [
      [
        [18, 30],
        [22, 33],
        [27, 38],
        [29, 43],
        [24, 44],
        [20, 39]
      ]
    ]
  },
  chinstrap: { name: 'Chin strap', strap: true },
  full: {
    name: 'Full beard',
    polys: [
      [
        [19, 33],
        [22, 36],
        [27, 38],
        [30, 37],
        [34, 37.5],
        [40, 37],
        [44, 35],
        [43, 41],
        [40, 46],
        [36, 49],
        [31, 49],
        [26, 47],
        [21, 43],
        [19, 38]
      ]
    ],
    gap: true
  },
  long: {
    name: 'Long beard',
    polys: [
      [
        [19, 33],
        [22, 36],
        [27, 38],
        [30, 37],
        [34, 37.5],
        [40, 37],
        [44, 35],
        [43, 41],
        [41, 48],
        [39, 55],
        [34, 59],
        [29, 56],
        [25, 49],
        [21, 43],
        [19, 38]
      ]
    ],
    gap: true,
    over: true
  }
} as const satisfies Record<string, BeardShape>;

export type BeardId = keyof typeof BEARDS;

export const EYES = {
  narrow: 'Narrow',
  open: 'Open',
  hooded: 'Hooded',
  sharp: 'Sharp',
  squint: 'Squint',
  tired: 'Tired'
} as const;

export type EyeId = keyof typeof EYES;

export const MOUTHS = {
  firm: 'Firm',
  thin: 'Thin',
  wide: 'Wide',
  smirk: 'Smirk',
  down: 'Downturned',
  smile: 'Smile',
  grit: 'Gritted teeth',
  full: 'Full lips'
} as const;

export type MouthId = keyof typeof MOUTHS;

export const BROWS = {
  stern: 'Stern',
  flat: 'Flat',
  raised: 'One raised',
  arch: 'Arched',
  heavy: 'Heavy'
} as const;

export type BrowId = keyof typeof BROWS;

export const GEARS = {
  none: 'None',
  shades: 'Shades',
  patch: 'Eyepatch',
  implant: 'Implant',
  headset: 'Headset',
  scar: 'Scar'
} as const;

export type GearId = keyof typeof GEARS;

export const BALDING: readonly HairId[] = ['bald', 'horseshoe', 'receding'];

export const hairFor = (gender: Gender): HairId[] =>
  (Object.keys(HAIRS) as HairId[]).filter((k) => HAIRS[k].genders.includes(gender));

export const hairGenders = (id: HairId): Gender[] => (HAIRS[id].genders.split('') as Gender[]).slice();
