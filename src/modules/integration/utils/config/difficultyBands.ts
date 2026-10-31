export type Band = { name: string; min: number; weight: number };

export const DIFFICULTY_BANDS: Band[] = [
    { name: 'easy', min: 0.75, weight: 0.4 },
    { name: 'medium', min: 0.35, weight: 0.4 },
    { name: 'hard', min: 0, weight: 0.2 },
];
