import {
    getEndOfDay,
    getEndOfMonth,
    getEndOfWeek,
    getStartOfDay,
    getStartOfMonth,
    getStartOfWeek,
} from '../../scoring/utils/dateUtils.js';

export const possibleFunctions = {
    DAILY: {
        start: getStartOfDay,
        end: getEndOfDay,
    },
    WEEKLY: {
        start: getStartOfWeek,
        end: getEndOfWeek,
    },
    MONTHLY: {
        start: getStartOfMonth,
        end: getEndOfMonth,
    },
};
