export const getStartOfDay = (date: Date) => {
    return new Date(
        `${date.getFullYear()}-${date.getMonth() + 1 < 10 ? '0' + date.getMonth() : date.getMonth()}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}T00:00:00`
    );
};

export const getEndOfDay = (date: Date) => {
    return new Date(
        new Date(
            `${date.getFullYear()}-${date.getMonth() + 1 < 10 ? '0' + date.getMonth() : date.getMonth()}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}T00:00:00`
        ).setDate(date.getDate() + 1)
    );
};
