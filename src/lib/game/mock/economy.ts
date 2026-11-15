import { START_TIME } from '../clock';
import type {
  BuildOrder,
  Colony,
  ComponentId,
  Deposit,
  Economy,
  GoodId,
  InstallationId,
  ItemId,
  MineralId,
  MonthFlow,
  ShippingLine,
  TradeBalance,
  Yard
} from '../types';

type Five<T> = readonly [T, T, T, T, T];

const minerals = <T>([iron, titanium, copper, uranium, ice]: Five<T>): Record<MineralId, T> => ({
  iron,
  titanium,
  copper,
  uranium,
  ice
});

const draws = (
  [iron, titanium, copper, uranium, ice]: Five<number>,
  fuel: number
): Record<MineralId | 'fuel', number> => ({ iron, titanium, copper, uranium, ice, fuel });

const installations = (
  mine: number,
  factory: number,
  refinery: number,
  lab: number,
  dome: number,
  spaceport: number,
  exchange: number
): Record<InstallationId, number> => ({ mine, factory, refinery, lab, dome, spaceport, exchange });

const parts = (
  cargo: number,
  sensor: number,
  hull: number,
  drive: number,
  tank: number
): Record<ComponentId, number> => ({
  'cargo-container': cargo,
  'sensor-array': sensor,
  'hull-plating': hull,
  'drive-coil': drive,
  'fuel-tank': tank
});

const deposit = (initial: number, accessibility: number, left = 1): Deposit => ({
  amount: Math.round(initial * left),
  initial,
  accessibility
});

type Goods = readonly [
  food: readonly [number, number],
  consumer: readonly [number, number],
  parts: readonly [number, number],
  medical: readonly [number, number],
  luxury: readonly [number, number]
];

const GOOD_IDS: readonly GoodId[] = ['food', 'consumer', 'parts', 'medical', 'luxury'];

const goods = (pairs: Goods): Record<GoodId, TradeBalance> =>
  Object.fromEntries(GOOD_IDS.map((id, i) => [id, { supply: pairs[i]![0], demand: pairs[i]![1] }])) as Record<
    GoodId,
    TradeBalance
  >;

const order = (
  id: number,
  item: ItemId,
  ordered: number,
  quantity: number,
  share: number,
  done: number
): BuildOrder => ({ id, item, ordered, quantity, share, done, paused: false, waiting: null });

const yard = (
  id: number,
  name: string,
  kind: Yard['kind'],
  capacity: number,
  tooled: string,
  slipways: Yard['slipways'],
  tasks: Yard['tasks'] = []
): Yard => ({ id, name, kind, capacity, tooled, slipways, tasks });

const idle = (id: number) => ({ id, build: null });

const building = (id: number, classId: string, done: number, total: number) => ({
  id,
  build: { classId, done, total }
});

const mockColonies = (): Colony[] => [
  {
    id: 'earth',
    name: 'Earth',
    system: 'sol',
    planet: 'terran',
    moon: true,
    population: 1.2e9,
    birthRate: 0.045,
    capacityBase: 1.5e9,
    workforceShare: 0.000667,
    governor: { name: 'A. Marchetti', bonus: 0.15 },
    garrison: 41,
    environment: { air: 'Breathable', gravity: '1.00 g', surface: '15 °C', note: 'Temperate, open air' },
    installations: installations(120, 60, 12, 20, 0, 3, 6),
    components: parts(120, 14, 32, 9, 40),
    stock: minerals([616_000, 364_000, 497_000, 56_000, 90_000]),
    fuel: 448_000,
    target: 700_000,
    draw: draws([22_000, 14_000, 9_000, 9_000, 0], 38_000),
    deposits: minerals([
      deposit(8e6, 0.9, 0.62),
      deposit(3e6, 0.6, 0.8),
      deposit(4e6, 0.7, 0.7),
      deposit(6e5, 0.2, 0.9),
      deposit(2e6, 0.3, 0.95)
    ]),
    queue: [
      order(1, 'refinery', 8, 8, 15, 12),
      order(2, 'lab', 30, 30, 25, 113),
      order(3, 'cargo-container', 1500, 700, 10, 0)
    ],
    yards: [yard(1, 'Earth high yard', 'naval', 18_000, 'pike', [idle(1), idle(2)])],
    trade: goods([
      [90, 20],
      [60, 10],
      [50, 10],
      [30, 10],
      [20, 15]
    ]),
    built: { atlas: 6, pathfinder: 3, pike: 2 },
    lowStock: {}
  },
  {
    id: 'luna',
    name: 'Luna',
    system: 'sol',
    planet: 'rock',
    moon: false,
    population: 400_000,
    birthRate: 0.035,
    capacityBase: 0,
    workforceShare: 0.12,
    governor: { name: 'R. Osei', bonus: 0.08 },
    garrison: 4,
    environment: { air: 'None, domed', gravity: '0.16 g', surface: '-23 °C', note: 'Vacuum, domed habitats' },
    installations: installations(6, 2, 0, 1, 3, 1, 0),
    components: parts(30, 6, 12, 2, 8),
    stock: minerals([6_000, 3_300, 5_300, 450, 800]),
    fuel: 7_650,
    target: 15_000,
    draw: draws([600, 400, 300, 120, 0], 900),
    deposits: minerals([
      deposit(900_000, 0.6, 0.9),
      deposit(250_000, 0.5, 1),
      deposit(300_000, 0.4, 1),
      deposit(40_000, 0.2, 1),
      deposit(150_000, 0.5, 1)
    ]),
    queue: [order(1, 'sensor-array', 6, 2, 100, 26)],
    yards: [
      yard(1, 'Luna yard 1', 'commercial', 40_000, 'atlas', [building(1, 'atlas', 876, 1200), idle(2)], []),
      yard(2, 'Luna yard 2', 'naval', 10_000, 'pathfinder', [building(1, 'pathfinder', 210, 600)])
    ],
    trade: goods([
      [0, 25],
      [0, 20],
      [10, 40],
      [0, 10],
      [0, 10]
    ]),
    built: { atlas: 4, pathfinder: 1 },
    lowStock: {}
  },
  {
    id: 'mars',
    name: 'Mars',
    system: 'sol',
    planet: 'mars',
    moon: true,
    population: 2.4e6,
    birthRate: 0.093,
    capacityBase: 0,
    workforceShare: 0.0959,
    governor: { name: 'T. Nakamura', bonus: 0.12 },
    garrison: 13,
    environment: {
      air: 'Thin CO2, domed',
      gravity: '0.38 g',
      surface: '-63 °C',
      note: 'Domed habitats, thin air'
    },
    installations: installations(8, 3, 2, 1, 6, 1, 0),
    components: parts(24, 4, 8, 1, 10),
    stock: minerals([20_400, 9_300, 14_100, 3_600, 2_400]),
    fuel: 25_200,
    target: 30_000,
    draw: draws([2_000, 800, 900, 300, 0], 1_200),
    deposits: minerals([
      deposit(1.2e6, 0.7, 0.9),
      deposit(4e5, 0.45),
      deposit(6e5, 0.55, 0.95),
      deposit(1.5e5, 0.25),
      deposit(8e5, 0.8, 0.97)
    ]),
    queue: [
      order(1, 'mine', 4, 2, 40, 22),
      order(2, 'dome', 2, 2, 20, 24),
      order(3, 'hull-plating', 10, 10, 15, 0)
    ],
    yards: [
      yard(
        1,
        'Mars orbital yard',
        'commercial',
        20_000,
        'mule',
        [building(1, 'mule', 384, 800)],
        [{ id: 1, kind: 'capacity', total: 600, done: 150, amount: 5_000 }]
      )
    ],
    trade: goods([
      [15, 30],
      [0, 25],
      [20, 35],
      [0, 15],
      [0, 8]
    ]),
    built: { mule: 2 },
    lowStock: {}
  },
  {
    id: 'ceres',
    name: 'Ceres',
    system: 'sol',
    planet: 'rock',
    moon: false,
    population: 20_000,
    birthRate: 0.03,
    capacityBase: 0,
    workforceShare: 0.5,
    governor: { name: 'L. Haddad', bonus: 0.05 },
    garrison: 2,
    environment: { air: 'None, domed', gravity: '0.03 g', surface: '-105 °C', note: 'Dwarf planet, domed' },
    installations: installations(2, 1, 0, 0, 1, 0, 0),
    components: parts(6, 0, 2, 0, 0),
    stock: minerals([2_800, 900, 600, 40, 5_200]),
    fuel: 1_200,
    target: 8_000,
    draw: draws([200, 80, 60, 10, 0], 150),
    deposits: minerals([
      deposit(500_000, 0.5, 1),
      deposit(80_000, 0.35, 1),
      deposit(60_000, 0.3, 1),
      deposit(5_000, 0.15, 1),
      deposit(900_000, 0.9, 1)
    ]),
    queue: [order(1, 'mine', 2, 2, 100, 0)],
    yards: [],
    trade: goods([
      [0, 10],
      [0, 8],
      [5, 20],
      [0, 5],
      [0, 3]
    ]),
    built: {},
    lowStock: {}
  },
  {
    id: 'europa',
    name: 'Europa',
    system: 'sol',
    planet: 'rock',
    moon: false,
    population: 6_000,
    birthRate: 0.03,
    capacityBase: 0,
    workforceShare: 0.6,
    governor: { name: 'S. Lindgren', bonus: 0.02 },
    garrison: 0,
    environment: { air: 'None, domed', gravity: '0.13 g', surface: '-160 °C', note: 'Ice crust, domed' },
    installations: installations(1, 0, 0, 0, 1, 0, 0),
    components: parts(0, 0, 0, 0, 0),
    stock: minerals([300, 40, 20, 0, 9_000]),
    fuel: 400,
    target: 5_000,
    draw: draws([40, 10, 5, 0, 0], 60),
    deposits: minerals([
      deposit(60_000, 0.3, 1),
      deposit(9_000, 0.2, 1),
      deposit(6_000, 0.2, 1),
      deposit(0, 0.1, 1),
      deposit(3e6, 0.95, 1)
    ]),
    queue: [],
    yards: [],
    trade: goods([
      [0, 6],
      [0, 5],
      [0, 8],
      [0, 3],
      [0, 2]
    ]),
    built: {},
    lowStock: {}
  },
  {
    id: 'landing',
    name: 'Centauri Landing',
    system: 'acen',
    planet: 'mars',
    moon: false,
    population: 22_000,
    birthRate: 0.05,
    capacityBase: 0,
    workforceShare: 0.5,
    governor: { name: 'D. Varga', bonus: 0.06 },
    garrison: 1,
    environment: { air: 'Thin N2, domed', gravity: '0.71 g', surface: '-12 °C', note: 'New outpost, domed' },
    installations: installations(2, 1, 0, 0, 2, 0, 0),
    components: parts(0, 0, 0, 0, 0),
    stock: minerals([1_100, 300, 260, 30, 700]),
    fuel: 500,
    target: 6_000,
    draw: draws([120, 40, 30, 5, 0], 80),
    deposits: minerals([
      deposit(400_000, 0.55, 1),
      deposit(70_000, 0.4, 1),
      deposit(90_000, 0.35, 1),
      deposit(12_000, 0.2, 1),
      deposit(300_000, 0.6, 1)
    ]),
    queue: [order(1, 'dome', 1, 1, 100, 0)],
    yards: [],
    trade: goods([
      [4, 4],
      [0, 6],
      [0, 10],
      [0, 4],
      [0, 2]
    ]),
    built: {},
    lowStock: {}
  }
];

const mockLines = (): ShippingLine[] => [
  { id: 1, name: 'Ceres Star', ships: 4, subsidy: false, growth: 0 },
  { id: 2, name: 'Inner Belt Freight', ships: 2, subsidy: false, growth: 0 },
  { id: 3, name: 'Luna Ferries', ships: 3, subsidy: true, growth: 0.3 }
];

const INCOME = [880, 910, 930, 905, 940, 960, 985, 970, 1005, 1020, 1010, 1040];
const SPENDING = [790, 820, 905, 860, 830, 880, 940, 915, 870, 930, 960, 920];

const mockHistory = (): MonthFlow[] =>
  INCOME.map((income, i) => ({ income, spending: SPENDING[i] ?? income }));

const monthOf = (ms: number): number => {
  const d = new Date(ms);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
};

export const mockEconomy = (): Economy => ({
  colonies: mockColonies(),
  lines: mockLines(),
  wealth: 18_400,
  history: mockHistory(),
  month: { income: 0, spending: 0 },
  monthIndex: monthOf(START_TIME),
  nextId: 100
});
