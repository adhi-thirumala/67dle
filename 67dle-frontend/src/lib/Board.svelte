<script lang="ts">
    import type { BoardState, LetterState } from "./game.svelte.ts";

    interface Props {
        board: BoardState;
        guesses: string[];
        currentGuess: string;
        shaking: boolean;
        maxRows?: number;
        revealRow?: number;
        selected?: boolean;
        onselect?: () => void;
    }

    let { board, guesses, currentGuess, shaking, maxRows = 6, revealRow = -1, selected = false, onselect }: Props = $props();

    // Get cell state and letter for a position
    function getCellData(
        row: number,
        col: number,
    ): { letter: string; state: LetterState } {
        // Completed guess row
        if (row < board.guessResults.length) {
            const guess = guesses[row] ?? "";
            const evaluation = board.guessResults[row];
            return {
                letter: guess[col].toUpperCase(),
                state: evaluation[col],
            };
        }

        // Current input row (only for unsolved boards)
        if (!board.solved && row === board.guessResults.length) {
            const letter = currentGuess[col] || "";
            return {
                letter: letter.toUpperCase(),
                state: letter ? "tbd" : "empty",
            };
        }

        // Empty future row
        return { letter: "", state: "empty" };
    }

    // Calculate visible rows
    const visibleRows = $derived(
        Math.min(maxRows, Math.max(board.guessResults.length + (board.solved ? 0 : 1), 6)),
    );

    // State classes
    const stateClasses: Record<LetterState, string> = {
        empty: "border-border bg-transparent",
        tbd: "border-border-filled bg-transparent",
        correct: "border-correct bg-correct text-white",
        present: "border-present bg-present text-white",
        absent: "border-absent bg-absent text-white",
    };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="grid grid-cols-5 gap-0.5 p-1 bg-neutral-800 rounded border-2 contain-strict cursor-pointer transition-colors
           {selected ? 'border-white ring-1 ring-white/40' : 'border-neutral-700'}"
    class:opacity-60={board.solved && !selected}
    class:border-correct={board.solved && !selected}
    class:animate-shake={shaking && !board.solved}
    style="contain-intrinsic-size: 120px;"
    onclick={onselect}
>
    {#each { length: visibleRows } as _, row}
        {#each { length: 5 } as _, col}
            {@const { letter, state } = getCellData(row, col)}
            {@const isRevealing = revealRow >= 0 && row === revealRow && state !== 'empty' && state !== 'tbd'}
            <div
                class="aspect-square flex items-center justify-center text-[10px] font-bold border {stateClasses[
                    state
                ]}"
                class:cell-reveal={isRevealing}
                style={isRevealing ? `animation-delay: ${col * 60}ms` : ''}
            >
                {letter}
            </div>
        {/each}
    {/each}
</div>

<style>
    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        20% {
            transform: translateX(-3px);
        }
        40% {
            transform: translateX(3px);
        }
        60% {
            transform: translateX(-3px);
        }
        80% {
            transform: translateX(3px);
        }
    }

    .animate-shake {
        animation: shake 0.5s ease-in-out;
    }

    @keyframes cell-reveal {
        0% {
            transform: scaleY(1);
            opacity: 0.4;
        }
        50% {
            transform: scaleY(0);
            opacity: 0.4;
        }
        51% {
            transform: scaleY(0);
            opacity: 1;
        }
        100% {
            transform: scaleY(1);
            opacity: 1;
        }
    }

    .cell-reveal {
        animation: cell-reveal 300ms ease forwards;
    }

    .contain-strict {
        contain: layout style paint;
    }
</style>
