import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, getSession, saveSession } from '../api/client';

const destinations = { Dispatcher: '/dispatcher', ResponseUnit: '/responder', Admin: '/admin' };

function Login() {
  const session = getSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session && destinations[session.role]) return <Navigate to={destinations[session.role]} replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await api.login({ username, password });
      saveSession(result);
      navigate(location.state?.from || destinations[result.role] || '/', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to sign in.');
    } finally { setSubmitting(false); }
  }

  return <main className="grid min-h-svh place-items-center bg-slate-950 px-4 py-10" id="main-content" tabIndex="-1"><section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9" aria-labelledby="login-title"><a className="text-sm font-semibold text-blue-700 underline" href="/">← Emergency reporting</a><p className="mt-6 text-sm font-bold tracking-widest text-amber-700">TAGOLOAN MDRRMO</p><h1 className="mt-2 text-3xl font-bold text-slate-950" id="login-title">Staff sign in</h1><p className="mt-2 text-slate-600">For dispatchers, response units, and administrators.</p>{error && <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-red-800" role="alert">{error}</div>}<form className="mt-6 grid gap-5" onSubmit={submit}><div><label className="font-semibold" htmlFor="username">Username</label><input className="mt-2 w-full rounded-lg border border-slate-300 p-3" autoComplete="username" id="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div><div><label className="font-semibold" htmlFor="password">Password</label><input className="mt-2 w-full rounded-lg border border-slate-300 p-3" autoComplete="current-password" id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><button className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-blue-300" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Sign in securely'}</button></form></section></main>;
}

export default Login;
