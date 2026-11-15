<script lang="ts">
  interface Props {
    label: string;
    value: number;
    min?: number;
    max?: number;
    width?: number;
    name?: string;
    disabled?: boolean;
    onchange?: (value: number) => void;
  }

  let {
    label,
    value = $bindable(),
    min = 1,
    max = 9999,
    width = 7,
    name,
    disabled = false,
    onchange
  }: Props = $props();
</script>

<label>
  <span>{label}</span>
  <input
    type="number"
    {min}
    {max}
    {name}
    {disabled}
    style:width="{width}ch"
    bind:value
    onchange={() => onchange?.(value)}
  />
</label>

<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 2px 4px;
    color: var(--dim);
  }
  input {
    font: inherit;
    color: var(--text);
    background: var(--bg);
    border: 0;
    box-shadow: var(--edge);
    padding: 1px 4px;
    margin: 0 2px;
  }
  input:disabled {
    opacity: 0.4;
  }
  input:focus-visible {
    outline: 2px solid var(--cool);
  }
</style>
