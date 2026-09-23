import { lazy, Suspense, useEffect, useState } from 'react';
import { api, clearSession } from '../api/client';
import { disconnectSocket } from '../api/socket';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { ShieldAlert, LogOut, Users, ScrollText, MonitorCog, BarChart3 } from 'lucide-react';

const StaffView = lazy(() => import('./admin/StaffView'));
const AuditView = lazy(() => import('./admin/AuditView'));
const AnalyticsView = lazy(() => import('./admin/AnalyticsView'));

const VIEW_LABELS = {
  staff: 'Staff Accounts',
  audit: 'Audit Activity',
  analytics: 'Analytics',
};

function ViewFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [reports, setReports] = useState([]);
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ username: '', fullName: '', phoneNumber: '', password: '', role: 'Dispatcher' });
  const [view, setView] = useState('analytics');

  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [nextUsers, nextLogs, nextConfig, nextIncidents, nextReports, nextUnits] = await Promise.all([
        api.adminUsers(), api.auditLogs(), api.config(),
        api.incidents(), api.reports(), api.units(),
      ]);
      setUsers(nextUsers); setLogs(nextLogs); setConfig(nextConfig);
      setIncidents(nextIncidents); setReports(nextReports); setUnits(nextUnits);
      setError('');
    } catch (requestError) { setError(requestError.message || 'Unable to load the administrator dashboard.'); }
    finally { setLoading(false); }
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
    <SidebarProvider>
      <Sidebar>
        {/* ── Brand ── */}
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-warning shrink-0" />
            <div>
              <p className="text-xs font-bold tracking-widest text-warning uppercase">TAGOLOAN MDRRMO</p>
              <p className="text-sm font-semibold leading-tight text-sidebar-foreground">Admin Dashboard</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        {/* ── Navigation ── */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === 'analytics'} onClick={() => setView('analytics')} tooltip="Analytics">
                  <BarChart3 />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === 'staff'} onClick={() => setView('staff')} tooltip="Staff Accounts">
                  <Users />
                  <span>Staff Accounts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === 'audit'} onClick={() => setView('audit')} tooltip="Audit Activity">
                  <ScrollText />
                  <span>Audit Activity</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>External</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<a href="/dispatcher" />} nativeButton={false} tooltip="Dispatcher View">
                  <MonitorCog />
                  <span>Dispatcher View</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarSeparator />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign Out" onClick={() => { disconnectSocket(); clearSession(); window.location.assign('/login'); }}>
                <LogOut />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main content area ── */}
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{VIEW_LABELS[view]}</span>
          </div>
        </header>

        <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {message && (
            <Alert className="border-success text-success bg-success/10">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Suspense fallback={<ViewFallback />}>
            {view === 'staff' && (
              <StaffView
                users={users}
                loading={loading}
                config={config}
                form={form}
                setForm={setForm}
                onRefresh={load}
                onCreateUser={createUser}
                onToggleUser={toggleUser}
              />
            )}

            {view === 'audit' && (
              <AuditView
                logs={logs}
                loading={loading}
                onRefresh={load}
              />
            )}

            {view === 'analytics' && (
              <AnalyticsView
                incidents={incidents}
                reports={reports}
                units={units}
                logs={logs}
                loading={loading}
                config={config}
                onRefresh={load}
              />
            )}
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AdminDashboard;
