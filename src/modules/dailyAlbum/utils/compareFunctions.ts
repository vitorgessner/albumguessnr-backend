import { Decimal } from '@prisma/client/runtime/client';
import { CellStatus, Direction } from './buildGuessRow';

export function compareYear(
    guessed: string | null,
    target: string | null
): { value: string | null; status: CellStatus; direction: Direction } {
    if (!guessed || !target) return { value: null, status: 'wrong', direction: null };
    const guessedInt = parseInt(guessed),
        targetInt = parseInt(target);
    if (guessedInt === targetInt) return { value: guessed, status: 'correct', direction: null };
    return { value: guessed, status: 'wrong', direction: guessedInt < targetInt ? 'up' : 'down' };
}

export function compareRanking(
    guessed: Decimal | null,
    target: Decimal | null
): { status: CellStatus; direction: Direction } {
    if (guessed === null || target === null) return { status: 'wrong', direction: null };
    if (guessed.toFixed(2) === target.toFixed(2)) return { status: 'correct', direction: null };
    return { status: 'wrong', direction: Number(guessed) < Number(target) ? 'up' : 'down' };
}

export function compareRating(
    guessed: Decimal | null,
    target: Decimal | null
): { status: CellStatus; direction: Direction } {
    if (guessed === null || target === null) return { status: 'wrong', direction: null };
    if (guessed.toFixed(2) === target.toFixed(2)) return { status: 'correct', direction: null };
    return { status: 'wrong', direction: Number(guessed) < Number(target) ? 'up' : 'down' };
}

export function compareArray(guessedIds: string[], targetIds: string[]): { status: CellStatus } {
    const correct = guessedIds.filter((id) => targetIds.includes(id));
    if (correct.length === 0) return { status: 'wrong' };
    if (correct.length === targetIds.length && guessedIds.length === targetIds.length) {
        return { status: 'correct' };
    }
    return { status: 'partial' };
}
