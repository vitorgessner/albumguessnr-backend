const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'dev',
    sameSite: 'strict' as const,
}

export default COOKIE_OPTIONS;