export interface GalleryBody {
  id: string;
  name: string;
  look: string;
  tilt?: number;
  spin?: number;
  pitch?: number;
  lights?: boolean;
  text: string;
}

export interface Group {
  id: string;
  name: string;
  bodies: readonly GalleryBody[];
}

export const FAMILY_TEXT = [
  {
    id: 'ice',
    name: 'Small icy moons',
    text: 'Pale and bright, cratered, some with grooves, one dark hemisphere or a big crater; many are lumpy rather than round.'
  },
  {
    id: 'rock',
    name: 'Small dark rocky moons',
    text: 'Dull grey to red-brown, battered by overlapping craters, often elongated.'
  },
  {
    id: 'captured',
    name: 'Captured irregular moons',
    text: 'Very dark, lumpy, with a few deep craters and sometimes a bright patch of exposed ice.'
  }
] as const;

export const GROUPS: readonly Group[] = [
  {
    id: 'inner',
    name: 'Mercury and Venus',
    bodies: [
      {
        id: 'mercury',
        name: 'Mercury',
        look: 'mercury',
        tilt: 0.05,
        text: 'Dull brown-grey, crowded with craters; bright ray craters and the pale smooth Caloris plain.'
      },
      {
        id: 'venus',
        name: 'Venus',
        look: 'venus',
        tilt: 0.1,
        spin: 0.15,
        text: 'Featureless cream-yellow cloud deck with a thick glowing haze; as the game has it.'
      }
    ]
  },
  {
    id: 'earthmoon',
    name: 'Earth and Moon',
    bodies: [
      {
        id: 'earth',
        name: 'Earth',
        look: 'earth',
        tilt: 0.4,
        lights: true,
        text: 'Blue oceans, green and tan land, white clouds and ice caps, city lights on the night side; as the game has it.'
      },
      {
        id: 'luna',
        name: 'The Moon',
        look: 'luna',
        tilt: 0.1,
        text: 'Pale cratered highlands with dark maria: Imbrium, Serenitatis, Crisium; Tycho with its long rays.'
      }
    ]
  },
  {
    id: 'mars',
    name: 'Mars and moons',
    bodies: [
      {
        id: 'mars',
        name: 'Mars',
        look: 'mars',
        tilt: 0.43,
        text: 'Rust-red with dark Syrtis and Valles Marineris, white polar caps; as the game has it.'
      },
      {
        id: 'phobos',
        name: 'Phobos',
        look: 'phobos',
        tilt: 0.1,
        spin: 0.8,
        text: 'Dark lumpy potato with the giant Stickney crater and parallel grooves.'
      },
      {
        id: 'deimos',
        name: 'Deimos',
        look: 'deimos',
        tilt: 0.1,
        spin: 0.7,
        text: 'Smaller, paler and smoother than Phobos: craters buried under dust.'
      }
    ]
  },
  {
    id: 'ceres',
    name: 'Ceres',
    bodies: [
      {
        id: 'ceres',
        name: 'Ceres',
        look: 'ceres',
        tilt: 0.05,
        text: 'Dark grey cratered ball with the very bright salt spots of Occator crater.'
      }
    ]
  },
  {
    id: 'jupiter',
    name: 'Jupiter and the Galileans',
    bodies: [
      {
        id: 'jupiter',
        name: 'Jupiter',
        look: 'jupiter',
        tilt: 0.06,
        text: 'Cream and brown cloud belts with the Great Red Spot; as the game has it.'
      },
      {
        id: 'io',
        name: 'Io',
        look: 'io',
        tilt: 0.05,
        text: 'Sulphur yellow with red and black volcanic spots, the dark Loki lava lake and the red ring of Pele.'
      },
      {
        id: 'europa',
        name: 'Europa',
        look: 'europa',
        tilt: 0.05,
        text: 'Smooth ivory ice netted with red-brown cracks and mottled chaos patches; almost no craters.'
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        look: 'ganymede',
        tilt: 0.05,
        text: 'Dark old plains beside paler grooved terrain, white polar frost and bright rayed craters.'
      },
      {
        id: 'callisto',
        name: 'Callisto',
        look: 'callisto',
        tilt: 0.05,
        text: 'The darkest and most cratered, speckled with bright ice; the Valhalla bullseye.'
      }
    ]
  },
  {
    id: 'saturn',
    name: 'Saturn and its moons',
    bodies: [
      {
        id: 'saturn',
        name: 'Saturn',
        look: 'saturn',
        tilt: 0,
        text: 'Butterscotch bands with the ring system; as the game has it.'
      },
      {
        id: 'mimas',
        name: 'Mimas',
        look: 'mimas',
        tilt: 0.05,
        text: 'Grey ball with one enormous crater, Herschel, and its central peak: the Death Star.'
      },
      {
        id: 'enceladus',
        name: 'Enceladus',
        look: 'enceladus',
        tilt: 0.05,
        pitch: -0.7,
        text: 'Brilliant white, smooth in the south where four blue tiger-stripe cracks cross the pole.'
      },
      {
        id: 'tethys',
        name: 'Tethys',
        look: 'tethys',
        tilt: 0.05,
        text: 'Cool blue-white and clean, with the huge Odysseus crater and the long Ithaca trench.'
      },
      {
        id: 'dione',
        name: 'Dione',
        look: 'dione',
        tilt: 0.05,
        text: 'Warm cream-grey, one side streaked with bright wispy fractures.'
      },
      {
        id: 'rhea',
        name: 'Rhea',
        look: 'rhea',
        tilt: 0.05,
        text: 'Dark neutral grey, densely cratered at every size, darker on one side.'
      },
      {
        id: 'titan',
        name: 'Titan',
        look: 'titan',
        tilt: 0.05,
        spin: 0.15,
        text: 'Orange haze hiding the surface, a darker northern hood and a thick glowing blue limb.'
      },
      {
        id: 'hyperion',
        name: 'Hyperion',
        look: 'hyperion',
        tilt: 0.1,
        spin: 0.9,
        text: 'Irregular lumpy shape; sponge-like, deeply pitted with dark red crater floors.'
      },
      {
        id: 'iapetus',
        name: 'Iapetus',
        look: 'iapetus',
        tilt: 0.05,
        text: 'Two-tone: one hemisphere coal-black, the other bright ice, a thin ridge along the equator.'
      }
    ]
  },
  {
    id: 'uranus',
    name: 'Uranus and its moons',
    bodies: [
      {
        id: 'uranus',
        name: 'Uranus',
        look: 'uranus',
        tilt: 0.1,
        text: 'Pale cyan and almost featureless; as the game has it.'
      },
      {
        id: 'miranda',
        name: 'Miranda',
        look: 'miranda',
        tilt: 0.05,
        text: 'Patchwork of angular terrains: dark smooth, cratered, bright ridged, split by faults.'
      },
      {
        id: 'ariel',
        name: 'Ariel',
        look: 'ariel',
        tilt: 0.05,
        text: 'Bright grey with a web of deep canyons and few craters.'
      },
      {
        id: 'umbriel',
        name: 'Umbriel',
        look: 'umbriel',
        tilt: 0.05,
        text: 'The dark one: dull grey and uniform, with one bright ring on the equator, Wunda.'
      },
      {
        id: 'titania',
        name: 'Titania',
        look: 'titania',
        tilt: 0.05,
        text: 'Mid-grey, reddish tinge, long rift valleys and a few bright rayed craters.'
      },
      {
        id: 'oberon',
        name: 'Oberon',
        look: 'oberon',
        tilt: 0.05,
        text: 'Dark grey-brown, thickly cratered, dark crater floors and bright rays.'
      }
    ]
  },
  {
    id: 'neptune',
    name: 'Neptune and Triton',
    bodies: [
      {
        id: 'neptune',
        name: 'Neptune',
        look: 'neptune',
        tilt: 0.05,
        text: 'Deep blue with the Great Dark Spot and bright white clouds; as the game has it.'
      },
      {
        id: 'triton',
        name: 'Triton',
        look: 'triton',
        tilt: 0.05,
        pitch: -0.55,
        text: 'Pink-white south polar cap streaked by geysers, dimpled cantaloupe terrain beyond it.'
      }
    ]
  },
  {
    id: 'pluto',
    name: 'Pluto and Charon',
    bodies: [
      {
        id: 'pluto',
        name: 'Pluto',
        look: 'pluto',
        tilt: 0.1,
        text: 'Red-tan with the pale heart, Tombaugh Regio, and the dark Cthulhu band beside it.'
      },
      {
        id: 'charon',
        name: 'Charon',
        look: 'charon',
        tilt: 0.1,
        pitch: 0.5,
        text: 'Neutral grey with a red-brown polar cap, Mordor Macula, and a canyon belt along the equator.'
      }
    ]
  },
  {
    id: 'dwarfs',
    name: 'Other dwarf planets',
    bodies: [
      {
        id: 'eris',
        name: 'Eris',
        look: 'eris',
        tilt: 0.1,
        text: 'Almost white and nearly featureless, with faint darker smudges.'
      },
      {
        id: 'haumea',
        name: 'Haumea',
        look: 'haumea',
        tilt: 0.1,
        spin: 1.6,
        text: 'Elongated, spins in four hours; icy white with a dark red spot.'
      },
      {
        id: 'makemake',
        name: 'Makemake',
        look: 'makemake',
        tilt: 0.1,
        text: 'Red-brown, mottled with paler and darker patches.'
      }
    ]
  }
];
