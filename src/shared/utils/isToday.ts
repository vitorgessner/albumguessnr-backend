export const isToday = (date: Date) => {
    const today = new Date();

    return (
        date.getUTCDate() === today.getUTCDate() &&
        date.getUTCMonth() === today.getUTCMonth() &&
        date.getUTCFullYear() === today.getUTCFullYear()
    );
};

export const isSameDate = (date: Date, date2: Date) => {
    return (
        date.getUTCDate() === date2.getUTCDate() &&
        date.getUTCMonth() === date2.getUTCMonth() &&
        date.getUTCFullYear() === date2.getUTCFullYear()
    );
};
