<script lang="ts">
  interface Props {
    value: number;
    tone?: 'accent' | 'hot' | 'cool';
    thick?: boolean;
    full?: boolean;
    faded?: boolean;
  }

  let { value, tone = 'accent', thick = false, full = false, faded = false }: Props = $props();

  const fill = $derived(Math.max(0, Math.min(1, value)));
</script>

<span
  class="ui-bar {tone}"
  class:thick
  class:full
  class:faded
  role="meter"
  aria-valuemin="0"
  aria-valuemax="1"
  aria-valuenow={fill}><i style:width="{fill * 100}%"></i></span
>
