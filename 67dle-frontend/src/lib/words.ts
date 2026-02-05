export function normalizeGuess(guess: string): string {
	return guess.trim().toLowerCase();
}

export function isGuessFormatValid(guess: string): boolean {
	return /^[a-z]{5}$/.test(guess);
}
