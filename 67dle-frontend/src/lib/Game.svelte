<script lang="ts">
  import { onMount } from 'svelte';
  import type { GameStore } from './game.svelte.ts';
  import Board from './Board.svelte';
  import Keyboard from './Keyboard.svelte';
  import GameOver from './GameOver.svelte';
  
  interface Props {
    game: GameStore;
    onBack: () => void;
  }
  
  let { game, onBack }: Props = $props();
  let hideSolved = $state(false);
  let showSettings = $state(false);
  const visibleBoards = $derived.by(() =>
    hideSolved ? game.boards.filter((board) => !board.solved) : game.boards
  );
  
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
      <button
        type="button"
        class="text-neutral-400 hover:text-white transition-colors"
        onclick={() => (showSettings = true)}
        aria-haspopup="dialog"
        aria-expanded={showSettings}
        aria-label="Open settings"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.32-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09c0 .7.4 1.32 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.45.45-.58 1.12-.33 1.82v0c.2.6.81 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.7 0-1.32.4-1.51 1z"></path>
        </svg>
      </button>
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
    <div class="grid gap-2 max-w-7xl mx-auto boards-grid"
         class:boards-checking={game.checking}
         style="grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));">
      {#each visibleBoards as board, i (i)}
        <Board 
          {board} 
          guesses={(board as { frozenGuesses?: string[] }).frozenGuesses ?? game.guesses}
          currentGuess={board.solved ? '' : game.currentGuess}
          shaking={game.shaking}
          maxRows={game.maxGuesses}
          revealRow={game.revealRow}
          selected={game.selectedBoardIndex === board.boardIndex}
          onselect={() => game.selectBoard(board.boardIndex)}
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

  {#if showSettings}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div class="bg-neutral-800 border border-neutral-700 rounded-lg w-full max-w-sm mx-4 p-6 animate-pop">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">Settings</h2>
          <button
            type="button"
            class="text-neutral-400 hover:text-white"
            onclick={() => (showSettings = false)}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        <label class="flex items-center justify-between gap-4 text-neutral-300">
          <span>Hide solved boards</span>
          <span class="relative inline-flex h-6 w-11 items-center">
            <input
              type="checkbox"
              class="peer sr-only"
              bind:checked={hideSolved}
            />
            <span class="h-6 w-11 rounded-full bg-neutral-700 transition-colors peer-checked:bg-correct"></span>
            <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
          </span>
        </label>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes pop-in {
    0% {
      opacity: 0;
      transform: scale(0.96);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-pop {
    animation: pop-in 160ms ease-out;
  }

  .boards-grid {
    transition: opacity 150ms ease;
  }

  .boards-checking {
    opacity: 0.5;
  }
</style>
