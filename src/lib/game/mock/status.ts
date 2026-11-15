import type { StatusValue } from '../types';

export const mockStatus = (): StatusValue[] => [
  { id: 'wealth', icon: 'coin', value: '12,480', title: 'Wealth' },
  { id: 'people', icon: 'people', value: '1.21bn', title: 'People' },
  { id: 'fuel', icon: 'drop', value: '4.2Mt', title: 'Fuel stock' },
  { id: 'shortage', icon: 'warn', value: 'Uranium', title: 'Running low', warn: true },
  { id: 'labs', icon: 'flask', value: '4/5', title: 'Labs busy' },
  { id: 'yards', icon: 'yard', value: '2/3', title: 'Shipyards busy' }
];
