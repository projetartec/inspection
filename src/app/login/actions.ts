'use server';
 
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
 
const secretKey = process.env.SESSION_KEY;
const key = new TextEncoder().encode(secretKey);

const users = [
    { username: 'Alexandre', password: 'ale1982' },
    { username: 'Clodoaldo', password: 'clod1981' },
    { username: 'Kaio', password: 'kaio2006' },
];
 
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Session expires in 1 day
    .sign(key);
}
 
export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This will happen if the token is expired or invalid
    return null;
  }
}
 
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const { username, password } = Object.fromEntries(formData);

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return 'Credenciais inválidas. Por favor, tente novamente.';
    }
 
    // Create the session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const session = await encrypt({ user: { username: user.username }, expires });
 
    // Save the session in a cookie
    cookies().set('session', session, { expires, httpOnly: true });

  } catch (error) {
    if ((error as Error).message.includes('CredentialsSignin')) {
      return 'Credenciais inválidas.';
    }
    return 'Algo deu errado. Por favor, tente novamente.';
  }
 
  redirect('/');
}

export async function logout() {
  // Destroy the session
  cookies().set('session', '', { expires: new Date(0) });
  redirect('/login');
}
 
export async function getSession() {
  const session = cookies().get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;
 
  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const res = NextResponse.next();
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}
