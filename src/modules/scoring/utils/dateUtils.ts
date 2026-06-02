export const getStartOfDay = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    return new Date(`${year}-${month}-${day}T00:00:00`);
};

export const getEndOfDay = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    return new Date(new Date(`${year}-${month}-${day}T00:00:00`).setDate(date.getDate() + 1));
};

export const getStartOfWeek = (date: Date) => {
    const dayOfWeek = date.getDay();
    const year = date.getFullYear();
    const month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    return new Date(
        new Date(`${year}-${month}-${day}T00:00:00`).setDate(date.getDate() - dayOfWeek)
    );
};

export const getEndOfWeek = (date: Date) => {
    const dayOfWeek = date.getDay();
    const year = date.getFullYear();
    const month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    return new Date(
        new Date(`${year}-${month}-${day}T00:00:00`).setDate(date.getDate() + (8 - dayOfWeek))
    );
};

export const getStartOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    return new Date(
        new Date(`${year}-${month}-${day}T00:00:00`).setDate(date.getDate() - Number(day) + 1)
    );
};

export const getEndOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();

    return new Date(
        new Date(
            new Date(`${year}-${month}-${day}T00:00:00`).setMonth(date.getMonth() + 1)
        ).setDate(date.getDate() - Number(day) + 1)
    );
};
