<script lang="ts">
  import { createGame, type GameMode, type GameStore } from './lib/game.svelte.ts';
  import Home from './lib/Home.svelte';
  import Game from './lib/Game.svelte';
  
  type Screen = 'home' | 'game';
  
  let currentScreen = $state<Screen>('home');
  let currentGame = $state<GameStore | null>(null);
  
  function startGame(mode: GameMode) {
    currentGame = createGame(mode);
    currentScreen = 'game';
  }
  
  function goHome() {
    currentScreen = 'home';
    currentGame = null;
  }
</script>

{#if currentScreen === 'home'}
  <Home onStartGame={startGame} />
{:else if currentScreen === 'game' && currentGame}
  <Game game={currentGame} onBack={goHome} />
{/if}
