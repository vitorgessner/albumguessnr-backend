export const isToday = (date: Date) => {
    const today = new Date();

    return (
        date.getUTCDate() === today.getUTCDate() &&
        date.getUTCMonth() === today.getUTCMonth() &&
        date.getUTCFullYear() === today.getUTCFullYear()
    );
};
