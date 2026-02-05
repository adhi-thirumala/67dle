<script lang="ts">
  import type { GameMode } from './game.svelte';
  
  interface Props {
    solvedCount: number;
    totalGuesses: number;
    mode: GameMode;
    boardCount: number;
    onBack: () => void;
  }
  
  let { solvedCount, totalGuesses, mode, boardCount, onBack }: Props = $props();
  
  const won = $derived(solvedCount === boardCount);
  
  async function share() {
    const modeText = mode === 'daily' ? 'Daily' : 'Random';
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    const text = `67dle ${modeText}\n${solvedCount}/${boardCount} solved\n${totalGuesses} guesses\n${origin}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  }
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
  <div class="bg-neutral-800 p-8 rounded-lg text-center max-w-sm mx-4">
    <h2 class="text-2xl font-bold mb-4">
      {won ? 'You Won!' : 'Game Over'}
    </h2>
    <p class="text-neutral-400 mb-6">
      You solved <span class="text-correct font-bold">{solvedCount}</span> out of {boardCount} boards
      in <span class="font-bold">{totalGuesses}</span> guesses.
    </p>
    <div class="flex flex-col gap-3">
      <button
        onclick={share}
        class="w-full px-8 py-3 bg-correct text-white font-bold rounded hover:opacity-90 transition-opacity"
      >
        Share Results
      </button>
      <button
        onclick={onBack}
        class="w-full px-8 py-3 bg-neutral-700 text-white font-bold rounded hover:bg-neutral-600 transition-colors"
      >
        Back to Menu
      </button>
    </div>
  </div>
</div>
