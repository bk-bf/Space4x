<script lang="ts">
  import { onMount } from 'svelte';
  import { planet } from '#lib/gfx/planets.ts';
  import { CanvasView, DefList, Panel, Pct, ScreenGrid, Split, Stack, Table, Tabs } from '#lib/ui/index.ts';
  import { requestRender, startRendering } from '#lib/ui/frame.ts';
  import { layoutCheck } from '#lib/ui/layoutCheck.ts';

  let tab = $state('one');
  let picked = $state(1);

  onMount(() => {
    window.space4xLayoutCheck = () => layoutCheck('gallery');
    startRendering();
    requestRender();
  });
</script>

<header id="top"><span class="tag">primitives</span></header>
<div id="stage">
  <ScreenGrid id="gallery" columns="320px minmax(0,1fr)">
    <Stack>
      <Panel title="Table">
        <Table
          head={['Name', '>Count', 'Done']}
          rows={[
            ['Alpha', 3, { pct: 40 }],
            ['Beta', 12, { pct: 75 }],
            [{ text: 'Gamma', warn: true }, 1, { meter: 10, label: '0.1' }]
          ]}
          selected={picked}
          onpick={(i) => (picked = i)}
        />
      </Panel>
      <Panel title="Definitions" grow>
        <Tabs
          tabs={[
            { id: 'one', label: 'One' },
            { id: 'two', label: 'Two' }
          ]}
          bind:active={tab}
        />
        <DefList
          rows={[
            ['Tab', tab],
            ['Picked', picked],
            ['Share', '20%']
          ]}
        />
        <Pct value={64} />
      </Panel>
    </Stack>
    <Split>
      <Panel title="Planet" body="fill">
        <CanvasView
          id="galleryCv"
          scale={2}
          bg="stars"
          draw={(f, t) => {
            f.start();
            planet(
              f,
              Math.floor(f.w / 2),
              Math.floor(f.h / 2),
              Math.floor(Math.min(f.w, f.h) / 3),
              'mars',
              t * 0.01,
              {
                tilt: 0.43,
                lights: true
              }
            );
            f.present();
          }}
        />
      </Panel>
      <Panel title="Fixed height" body="col">
        <CanvasView
          id="fixedCv"
          scale={3}
          height={160}
          bg="grid"
          draw={(f) => {
            f.start();
            f.present();
          }}
        />
        <DefList
          two
          rows={[
            ['A', 1],
            ['B', 2]
          ]}
        />
      </Panel>
    </Split>
  </ScreenGrid>
</div>
