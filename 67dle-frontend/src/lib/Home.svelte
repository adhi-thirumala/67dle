<script lang="ts">
  import type { GameMode } from './game.svelte';
  
  interface Props {
    onStartGame: (mode: GameMode) => void;
  }
  
  let { onStartGame }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-8">
  <div class="text-center max-w-md">
    <!-- Logo -->
    <h1 class="text-7xl font-black tracking-tight mb-2">
      <span class="text-correct">67</span><span class="text-white">dle</span>
    </h1>
    <p class="text-neutral-400 text-lg mb-12">
      Solve 67 Wordles at once
    </p>
    
    <!-- Buttons -->
    <div class="flex flex-col gap-4">
      <button
        onclick={() => onStartGame('daily')}
        class="w-full py-4 px-8 bg-correct hover:bg-correct/90 text-white text-lg font-bold rounded-lg transition-colors"
      >
        Game of the Day
      </button>
      
      <button
        onclick={() => onStartGame('random')}
        class="w-full py-4 px-8 bg-neutral-700 hover:bg-neutral-600 text-white text-lg font-bold rounded-lg transition-colors"
      >
        Random Game
      </button>
    </div>
    
    <!-- Info -->
    <p class="text-neutral-500 text-sm mt-12">
      73 guesses to solve all 67 boards
    </p>
  </div>
</div>
