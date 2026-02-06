<script lang="ts">
    import type { BoardState, LetterState } from "./game.svelte.ts";

    interface CellData {
        letter: string;
        state: LetterState;
    }

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

    // --- Precomputed completed rows: only recomputes when guessResults/guesses change, NOT on typing ---
    const completedRows = $derived.by(() => {
        const rows: CellData[][] = [];
        for (let r = 0; r < board.guessResults.length; r++) {
            const guess = guesses[r] ?? "";
            const evaluation = board.guessResults[r];
            const row: CellData[] = [];
            for (let c = 0; c < 5; c++) {
                row.push({
                    letter: guess[c]?.toUpperCase() ?? "",
                    state: evaluation[c],
                });
            }
            rows.push(row);
        }
        return rows;
    });

    // --- Current input row: only recomputes when currentGuess changes (typing) ---
    // For solved boards, this is never read in the template.
    const currentRow = $derived.by(() => {
        if (board.solved) return null;
        const row: CellData[] = [];
        for (let c = 0; c < 5; c++) {
            const letter = currentGuess[c] ?? "";
            row.push({
                letter: letter ? letter.toUpperCase() : "",
                state: letter ? "tbd" as LetterState : "empty" as LetterState,
            });
        }
        return row;
    });

    // --- Number of visible rows ---
    const visibleRows = $derived(
        Math.min(maxRows, Math.max(board.guessResults.length + (board.solved ? 0 : 1), 6)),
    );

    // --- Number of empty rows at the bottom ---
    const emptyRowCount = $derived(
        visibleRows - board.guessResults.length - (board.solved ? 0 : 1)
    );

    // State classes - constant lookup
    const stateClasses: Record<LetterState, string> = {
        empty: "border-border bg-transparent",
        tbd: "border-border-filled bg-transparent",
        correct: "border-correct bg-correct text-white",
        present: "border-present bg-present text-white",
        absent: "border-absent bg-absent text-white",
    };

    // Shared empty cell constant
    const EMPTY_CELL: CellData = { letter: "", state: "empty" };
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
    <!-- Completed rows: only rerender when guessResults change (on submit), NOT on typing -->
    {#each completedRows as row, rowIdx}
        {#each row as cell, col}
            {@const isRevealing = revealRow >= 0 && rowIdx === revealRow && cell.state !== 'empty' && cell.state !== 'tbd'}
            <div
                class="aspect-square flex items-center justify-center text-[10px] font-bold border {stateClasses[cell.state]}"
                class:cell-reveal={isRevealing}
                style={isRevealing ? `animation-delay: ${col * 60}ms` : ''}
            >
                {cell.letter}
            </div>
        {/each}
    {/each}

    <!-- Current input row: only rerenders on typing. Skipped entirely for solved boards. -->
    {#if currentRow}
        {#each currentRow as cell}
            <div
                class="aspect-square flex items-center justify-center text-[10px] font-bold border {stateClasses[cell.state]}"
            >
                {cell.letter}
            </div>
        {/each}
    {/if}

    <!-- Empty rows: completely static, no reactive dependencies -->
    {#each { length: Math.max(0, emptyRowCount) } as _}
        <div class="aspect-square flex items-center justify-center text-[10px] font-bold border border-border bg-transparent"></div>
        <div class="aspect-square flex items-center justify-center text-[10px] font-bold border border-border bg-transparent"></div>
        <div class="aspect-square flex items-center justify-center text-[10px] font-bold border border-border bg-transparent"></div>
        <div class="aspect-square flex items-center justify-center text-[10px] font-bold border border-border bg-transparent"></div>
        <div class="aspect-square flex items-center justify-center text-[10px] font-bold border border-border bg-transparent"></div>
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
