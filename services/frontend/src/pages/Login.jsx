import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { api, ApiError, getSession, saveSession } from '../api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OrganizationHero } from '@/components/branding/OrganizationBrand';
import { ArrowLeft } from 'lucide-react';

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
    } finally { 
      setSubmitting(false); 
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10" id="main-content" tabIndex="-1">
      <OrganizationHero />

      <div className="flex w-full max-w-md flex-col gap-6">
        
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors w-fit">
          <ArrowLeft className="size-4" />
          Back to Public Portal
        </Link>

        <Card className="py-2">
          <CardHeader className="text-center flex flex-col gap-1">
            <CardTitle className="text-lg font-bold">Secure Access Portal</CardTitle>
            <CardDescription className="text-sm">Sign in for dispatchers, response units, and administrators.</CardDescription>
          </CardHeader>
          
          <CardContent className="mt-4">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form id="login-form" onSubmit={submit} className="flex flex-col gap-6">
              <FieldGroup className="gap-6">
                <Field>
                  <FieldLabel htmlFor="username">Badge ID / Username</FieldLabel>
                  <Input 
                    id="username" 
                    autoComplete="username"
                    placeholder="Enter your assigned badge ID"
                    value={username} 
                    onChange={(event) => setUsername(event.target.value)} 
                    className="h-14 text-base px-4"
                    required 
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input 
                    id="password" 
                    type="password" 
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password} 
                    onChange={(event) => setPassword(event.target.value)} 
                    className="h-14 text-base px-4 tracking-[0.2em] placeholder:tracking-normal placeholder:text-base"
                    required 
                  />
                </Field>
              </FieldGroup>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold mt-1" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? 'Authenticating...' : 'Sign In Securely'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default Login;
