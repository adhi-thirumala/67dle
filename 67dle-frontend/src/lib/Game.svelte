<script lang="ts">
  import { onMount } from 'svelte';
  import type { GameStore } from './game.svelte';
  import Board from './Board.svelte';
  import Keyboard from './Keyboard.svelte';
  import GameOver from './GameOver.svelte';
  
  interface Props {
    game: GameStore;
    onBack: () => void;
  }
  
  let { game, onBack }: Props = $props();
  
  // Handle physical keyboard
  onMount(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      if (key === 'escape') {
        e.preventDefault();
        onBack();
        return;
      }
      
      if (key === 'enter' || key === 'backspace' || /^[a-z]$/.test(key)) {
        e.preventDefault();
        game.handleKey(key);
      }
    }
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="flex flex-col h-screen max-h-screen">
  <!-- Header -->
  <header class="flex justify-between items-center px-4 py-2 border-b border-neutral-700 shrink-0">
    <div class="flex items-center gap-4">
      <button 
        onclick={onBack}
        class="text-neutral-400 hover:text-white transition-colors"
      >
        ← Back
      </button>
      <h1 class="text-xl font-bold tracking-wider">
        <span class="text-correct">67</span>dle
      </h1>
      {#if game.mode === 'daily'}
        <span class="text-xs bg-correct/20 text-correct px-2 py-0.5 rounded">Daily</span>
      {:else}
        <span class="text-xs bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded">Random</span>
      {/if}
    </div>
      <div class="flex items-center gap-4 text-sm">
        <div class="text-neutral-400">
          Guesses: <span class="text-white font-bold">{game.totalGuesses}</span>/<span class="text-neutral-500">{game.maxGuesses}</span>
        </div>
        <div class="text-neutral-400">
          Solved: <span class="text-correct font-bold">{game.solvedCount}</span>/{game.boardCount}
        </div>
      </div>
    </header>

    {#if game.loading}
      <div class="px-4 py-2 text-sm text-neutral-400 border-b border-neutral-800">
        Loading game...
      </div>
    {:else if game.error}
      <div class="px-4 py-2 text-sm text-red-400 border-b border-red-900/40">
        {game.error}
      </div>
    {/if}
  
  <!-- Boards Grid -->
  <div class="flex-1 overflow-auto p-3">
    <div class="grid gap-2 max-w-7xl mx-auto"
         style="grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));">
      {#each game.boards as board, i (i)}
        <Board 
          {board} 
          guesses={game.guesses}
          currentGuess={game.currentGuess} 
          shaking={game.shaking}
          maxRows={game.maxGuesses}
        />
      {/each}
    </div>
  </div>
  
  <!-- Keyboard -->
  <Keyboard keyStates={game.keyboardState} onKey={game.handleKey} />
  
  <!-- Game Over Modal -->
  {#if game.gameOver}
    <GameOver 
      solvedCount={game.solvedCount} 
      totalGuesses={game.totalGuesses}
      mode={game.mode}
      boardCount={game.boardCount}
      {onBack}
    />
  {/if}
</div>
