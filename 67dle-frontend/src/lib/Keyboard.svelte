<script lang="ts">
  import type { LetterState } from './game.svelte.ts';
  
  interface Props {
    keyStates: Map<string, LetterState>;
    onKey: (key: string) => void;
  }
  
  let { keyStates, onKey }: Props = $props();
  
  const rows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace']
  ];
  
  function getKeyClass(key: string): string {
    const state = keyStates.get(key);
    if (!state) return 'bg-neutral-500';
    
    switch (state) {
      case 'correct': return 'bg-correct';
      case 'present': return 'bg-present';
      case 'absent': return 'bg-absent';
      default: return 'bg-neutral-500';
    }
  }
  
  function getKeyLabel(key: string): string {
    if (key === 'enter') return 'Enter';
    if (key === 'backspace') return '←';
    return key.toUpperCase();
  }
  
  function handleClick(key: string) {
    onKey(key);
  }
</script>

<div class="flex flex-col gap-1 p-2 bg-neutral-800 border-t border-neutral-700">
  {#each rows as row}
    <div class="flex justify-center gap-1">
      {#each row as key}
        <button
          class="h-12 rounded font-bold text-white select-none active:scale-95 transition-transform
                 {key === 'enter' || key === 'backspace' ? 'px-3 text-xs min-w-14' : 'min-w-8 text-sm'}
                 {getKeyClass(key)}"
          onclick={() => handleClick(key)}
          ontouchstart={(e) => { e.preventDefault(); handleClick(key); }}
        >
          {getKeyLabel(key)}
        </button>
      {/each}
    </div>
  {/each}
</div>
