import { Hono } from 'hono';
import { getDb } from '../db.js';
import { SignJWT } from 'jose';
import '../types.js';
function getJwtSecret(c) {
    const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production';
    return new TextEncoder().encode(secret);
}
function getGoogleClientId(c) {
    return c.env?.GOOGLE_CLIENT_ID || '';
}
function getGoogleClientSecret(c) {
    return c.env?.GOOGLE_CLIENT_SECRET || '';
}
function getAllowedOrigins() {
    return [
        'https://liftoff.sirin.dev',
        'https://07621f2c.liftoff-drw.pages.dev',
        'https://liftoff-drw.pages.dev',
        'http://localhost:5173',
        'http://localhost:3000'
    ];
}
function isValidOrigin(origin) {
    if (!origin)
        return false;
    const allowed = getAllowedOrigins();
    return allowed.includes(origin);
}
const oauth = new Hono();
// Generate Google OAuth URL and redirect
oauth.get('/', async (c) => {
    const clientId = getGoogleClientId(c);
    if (!clientId) {
        return c.json({ error: 'Google OAuth not configured' }, 500);
    }
    // Get the frontend redirect URL from query param
    let frontendUrl = c.req.query('redirect');
    // Validate the redirect URL
    if (!frontendUrl || !isValidOrigin(frontendUrl)) {
        // Default to custom domain if available, otherwise Pages URL
        frontendUrl = 'https://liftoff.sirin.dev';
    }
    const redirectUri = 'https://liftoff-api.sirin-29.workers.dev/api/auth/google/callback';
    // Pass frontend URL through state param for callback to use
    const state = crypto.randomUUID();
    const encodedState = btoa(JSON.stringify({ state, redirect: frontendUrl }));
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: encodedState,
        access_type: 'offline',
        prompt: 'consent'
    });
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return c.redirect(googleAuthUrl);
});
// Handle Google OAuth callback
oauth.get('/callback', async (c) => {
    try {
        const code = c.req.query('code');
        const error = c.req.query('error');
        const stateParam = c.req.query('state');
        if (error) {
            console.error('Google OAuth error:', error);
            return c.redirect('https://liftoff.sirin.dev/login?error=google_denied');
        }
        if (!code) {
            return c.redirect('https://liftoff.sirin.dev/login?error=no_code');
        }
        // Decode state to get frontend redirect URL
        let frontendUrl = 'https://liftoff.sirin.dev';
        try {
            if (stateParam) {
                const stateData = JSON.parse(atob(stateParam));
                if (stateData.redirect && isValidOrigin(stateData.redirect)) {
                    frontendUrl = stateData.redirect;
                }
            }
        }
        catch (e) {
            console.error('Failed to decode state:', e);
        }
        const clientId = getGoogleClientId(c);
        const clientSecret = getGoogleClientSecret(c);
        if (!clientId || !clientSecret) {
            return c.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
        }
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: 'https://liftoff-api.sirin-29.workers.dev/api/auth/google/callback',
                grant_type: 'authorization_code'
            })
        });
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange error:', errorData);
            return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
        }
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!userInfoResponse.ok) {
            return c.redirect(`${frontendUrl}/login?error=userinfo_failed`);
        }
        const googleUser = await userInfoResponse.json();
        if (!googleUser.email) {
            return c.redirect(`${frontendUrl}/login?error=no_email`);
        }
        const db = getDb();
        // Check if user exists by email
        const existingUser = await db.execute({
            sql: 'SELECT id, username, email FROM users WHERE email = ?',
            args: [googleUser.email]
        });
        let userId;
        let username;
        if (existingUser.rows.length > 0) {
            // Existing user - log them in
            const user = existingUser.rows[0];
            userId = Number(user.id);
            username = user.username;
        }
        else {
            // New user - create account
            const generatedUsername = googleUser.name?.replace(/\s+/g, '_').toLowerCase() ||
                googleUser.email.split('@')[0];
            // Check if username exists, append random suffix if needed
            const usernameCheck = await db.execute({
                sql: 'SELECT id FROM users WHERE username = ?',
                args: [generatedUsername]
            });
            const finalUsername = usernameCheck.rows.length > 0
                ? `${generatedUsername}_${Math.floor(Math.random() * 10000)}`
                : generatedUsername;
            // Generate a random password for OAuth users (they'll login via Google)
            const crypto = await import('crypto');
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const bcrypt = await import('bcryptjs');
            const passwordHash = await bcrypt.hash(randomPassword, 12);
            const result = await db.execute({
                sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                args: [finalUsername, googleUser.email, passwordHash]
            });
            userId = Number(result.lastInsertRowid);
            username = finalUsername;
        }
        // Issue JWT
        const secret = getJwtSecret(c);
        const token = await new SignJWT({ userId, username })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .setIssuedAt()
            .sign(secret);
        // Redirect to frontend with token
        return c.redirect(`${frontendUrl}/oauth/callback?token=${encodeURIComponent(token)}&username=${encodeURIComponent(username)}`);
    }
    catch (error) {
        console.error('OAuth callback error:', error);
        return c.redirect('https://liftoff.sirin.dev/login?error=oauth_failed');
    }
});
export { oauth as oauthRoutes };
