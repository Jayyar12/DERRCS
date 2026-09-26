import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { api, ApiError, getSession, saveSession } from '../api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { OrganizationHero } from '@/components/branding/OrganizationBrand';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const destinations = { Dispatcher: '/dispatcher', ResponseUnit: '/responder', Admin: '/admin' };

function Login() {
  const session = getSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <PageHeader
        variant="public"
        title="Agency Login"
        actions={(
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Public Portal
          </Link>
        )}
      />

      <main
        className="flex flex-1 flex-col items-center justify-center px-4 py-10"
        id="main-content"
        tabIndex="-1"
      >
        <div className="flex w-full max-w-md flex-col gap-6">
          <OrganizationHero />
          <Card className="py-2">
            <CardHeader className="flex flex-col gap-1 text-center">
              <CardTitle className="text-lg font-bold">Secure Access Portal</CardTitle>
              <CardDescription className="text-sm">
                Sign in for dispatchers, response units, and administrators.
              </CardDescription>
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
                      onChange={(event) => {
                        setError('');
                        setUsername(event.target.value);
                      }} 
                      className="h-14 text-base px-4"
                      required 
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative flex items-center">
                      <Input 
                        id="password" 
                        type={showPassword ? 'text' : 'password'} 
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password} 
                        onChange={(event) => {
                          setError('');
                          setPassword(event.target.value);
                        }} 
                        className={cn(
                          "h-14 text-base px-4 pr-12",
                          !showPassword && "tracking-[0.2em] placeholder:tracking-normal placeholder:text-base"
                        )}
                        required 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                  </Field>
                </FieldGroup>

                <Button 
                  type="submit" 
                  className="mt-1 h-12 w-full text-base font-bold" 
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    'Sign In Securely'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default Login;
