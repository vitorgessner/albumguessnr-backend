import { env } from "../../../shared/config/env.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.NODE_ENV !== 'dev',
    sameSite: 'strict' as const,
}

export default COOKIE_OPTIONS;