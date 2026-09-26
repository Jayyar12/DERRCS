import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, clearSession } from '../api/client';
import { disconnectSocket } from '../api/socket';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageContainer } from '@/components/layout/PageContainer';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'analytics';
  const view = ['analytics', 'staff', 'audit'].includes(currentView) ? currentView : 'analytics';

  function setView(nextView) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextView === 'analytics') {
        next.delete('view');
      } else {
        next.set('view', nextView);
      }
      return next;
    });
  }

  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const createInFlightRef = useRef(false);
  const updateInFlightRef = useRef(false);

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
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setCreatingUser(true);
    setError('');
    try {
      await api.createUser(form);
      setForm({ username: '', fullName: '', phoneNumber: '', password: '', role: 'Dispatcher' });
      setMessage('Staff account created.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to create the staff account.');
    } finally {
      createInFlightRef.current = false;
      setCreatingUser(false);
    }
  }
  
  async function toggleUser(user) {
    if (updateInFlightRef.current) return;
    updateInFlightRef.current = true;
    setUpdatingUserId(user.id);
    setError('');
    try {
      await api.updateUser(user.id, { isActive: !user.is_active });
      setMessage(`${user.full_name} is now ${user.is_active ? 'deactivated' : 'active'}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update the staff account.');
    } finally {
      updateInFlightRef.current = false;
      setUpdatingUserId(null);
    }
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
                  <BarChart3 data-icon="inline-start" />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === 'staff'} onClick={() => setView('staff')} tooltip="Staff Accounts">
                  <Users data-icon="inline-start" />
                  <span>Staff Accounts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === 'audit'} onClick={() => setView('audit')} tooltip="Audit Activity">
                  <ScrollText data-icon="inline-start" />
                  <span>Audit Activity</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>External</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<a href="/dispatcher" />} tooltip="Dispatcher View">
                  <MonitorCog data-icon="inline-start" />
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
                <LogOut data-icon="inline-start" />
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

        <PageContainer maxWidth="7xl" className="flex flex-col gap-6">
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

          <ErrorBoundary key={view}>
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
                  creatingUser={creatingUser}
                  updatingUserId={updatingUserId}
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
          </ErrorBoundary>
        </PageContainer>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AdminDashboard;
