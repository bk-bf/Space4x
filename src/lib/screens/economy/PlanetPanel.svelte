<script lang="ts">
  import type { Colony } from '#lib/game/types.ts';
  import { CanvasView, DefList, Panel, shell } from '#lib/ui/index.ts';
  import { formatPeople, formatRate } from './format.ts';
  import { drawColonyPlanet } from './planetView.ts';
  import { growthRate, workersFree } from './sim.ts';

  let { colony }: { colony: Colony } = $props();
</script>

<Panel title={colony.name} grow body="col">
  <CanvasView scale={2} bg="stars" draw={(fb, t) => drawColonyPlanet(fb, t, colony.planet, colony.moon)} />
  <DefList
    rows={[
      ['People', formatPeople(colony.population)],
      ['Growth', `${formatRate(growthRate(colony))} a year`],
      ['Workers free', Math.round(workersFree(colony)).toLocaleString('en-US')],
      ['Mines', colony.installations.mine],
      ['Factories', colony.installations.factory]
    ]}
  />
  <div class="add">
    <button id="openColony" onclick={() => shell.setScreen('colony')}>Open colony</button>
  </div>
</Panel>
