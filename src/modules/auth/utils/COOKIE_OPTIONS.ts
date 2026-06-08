import { env } from "../../../shared/config/env.js";

const COOKIE_OPTIONS = (maxAge: number) => {
    return {
        httpOnly: true,
        secure: env.NODE_ENV !== 'dev',
        sameSite: 'strict' as const,
        maxAge,
    }
}

export default COOKIE_OPTIONS;