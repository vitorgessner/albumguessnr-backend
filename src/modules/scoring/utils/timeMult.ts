export const timeMult = (percentage: number) => {
    if (percentage >= 80) return 2;
    if (percentage >= 60) return 1.7;
    if (percentage >= 40) return 1.4;
    if (percentage >= 20) return 1.2;
    return 1;
};
