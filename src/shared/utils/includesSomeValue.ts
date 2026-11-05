export const includesSomeValue = <T>(arr: T[], arrValues: T[]) => {
    return arrValues.map((value) => arr.includes(value)).some((response) => !!response);
};
