export const isYesterday = (date: Date) => {
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));

    return (
        date.getUTCDate() === yesterday.getUTCDate() &&
        date.getUTCMonth() === yesterday.getUTCMonth() &&
        date.getUTCFullYear() === yesterday.getUTCFullYear()
    );
};
