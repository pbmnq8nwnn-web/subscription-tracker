import { getIronSession } from 'iron-session';

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'sub-tracker-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}

export async function requireAuth(req, res) {
  const session = await getSession(req, res);
  if (!session.authenticated) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}
