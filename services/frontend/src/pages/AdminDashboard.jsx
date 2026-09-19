import { useEffect, useState } from 'react';
import { api, clearSession } from '../api/client';
import { disconnectSocket } from '../api/socket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, LogOut } from 'lucide-react';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ username: '', fullName: '', phoneNumber: '', password: '', role: 'Dispatcher' });

  async function load() {
    try {
      const [nextUsers, nextLogs, nextConfig] = await Promise.all([api.adminUsers(), api.auditLogs(), api.config()]);
      setUsers(nextUsers); setLogs(nextLogs); setConfig(nextConfig); setError('');
    } catch (requestError) { setError(requestError.message || 'Unable to load the administrator dashboard.'); }
  }
  
  useEffect(() => { load(); }, []);

  async function createUser(event) {
    event.preventDefault();
    try { await api.createUser(form); setForm({ username: '', fullName: '', phoneNumber: '', password: '', role: 'Dispatcher' }); setMessage('Staff account created.'); load(); }
    catch (requestError) { setError(requestError.message); }
  }
  
  async function toggleUser(user) {
    try { await api.updateUser(user.id, { isActive: !user.is_active }); setMessage(`${user.full_name} is now ${user.is_active ? 'deactivated' : 'active'}.`); load(); }
    catch (requestError) { setError(requestError.message); }
  }

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6 shadow-sm sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="size-6 text-warning" />
          <div>
            <p className="text-xs font-bold tracking-widest text-warning uppercase">TAGOLOAN MDRRMO</p>
            <h1 className="text-xl font-bold leading-none">Admin Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4" href="/dispatcher">
            Dispatcher View
          </a>
          <Button variant="outline" size="sm" onClick={() => { disconnectSocket(); clearSession(); window.location.assign('/login'); }}>
            <LogOut className="size-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {error && (
          <Alert variant="destructive" className="lg:col-span-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {message && (
          <Alert className="lg:col-span-2 border-success text-success bg-success/10">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Staff Accounts</CardTitle>
                <CardDescription>Manage dispatchers, responders, and admins.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell>
                          <div className="font-semibold">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.username}</div>
                        </TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'secondary'} className={user.is_active ? 'bg-success text-success-foreground hover:bg-success' : ''}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={user.id === localStorage.getItem('derrsc_user_id')} 
                            onClick={() => toggleUser(user)}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Staff Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createUser} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="new-full-name">Full Name</FieldLabel>
                      <Input id="new-full-name" value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-username">Username</FieldLabel>
                      <Input id="new-username" autoComplete="username" value={form.username} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-phone">Phone (Optional)</FieldLabel>
                      <Input id="new-phone" type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(e) => setForm((c) => ({ ...c, phoneNumber: e.target.value }))} />
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="new-password">Temporary Password</FieldLabel>
                      <Input id="new-password" type="password" minLength="8" autoComplete="new-password" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-role">Role</FieldLabel>
                      <select 
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                        id="new-role" 
                        value={form.role} 
                        onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}
                      >
                        {['Dispatcher', 'ResponseUnit', 'Admin'].map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </Field>
                  </FieldGroup>
                </div>
                <Button type="submit">Create Account</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 content-start">
          <Card>
            <CardHeader>
              <CardTitle>Operational Configuration</CardTitle>
              <CardDescription>Thresholds synced with algorithmic microservices.</CardDescription>
            </CardHeader>
            <CardContent>
              {config ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/40 p-4 border border-border">
                    <div className="text-sm text-muted-foreground mb-1">DBSCAN Radius</div>
                    <div className="text-xl font-bold tabular-nums">{config.dbscanEpsilonMeters} m</div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-4 border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Min Reports</div>
                    <div className="text-xl font-bold tabular-nums">{config.dbscanMinPoints}</div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-4 border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Reported Alert</div>
                    <div className="text-xl font-bold tabular-nums">{config.reportedEscalationMinutes} min</div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-4 border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Validated Alert</div>
                    <div className="text-xl font-bold tabular-nums">{config.validatedEscalationMinutes} min</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading configuration…</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.slice(0, 12).map((log) => (
                  <div className="flex gap-4 items-start pb-4 border-b border-border last:border-0 last:pb-0" key={log.id}>
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.actor_name || 'System'} &middot; {log.entity_name} {log.entity_id}</p>
                      <p className="text-xs text-muted-foreground/60 tabular-nums mt-1">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
