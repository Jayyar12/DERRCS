import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Field, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, Activity } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';

const TIME_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
];

const SEVERITY_VARIANT = {
  Critical: 'destructive',
  High: 'destructive',
  Moderate: 'default',
  Low: 'secondary',
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterByTimeRange(items, key, dateField = 'created_at') {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  return items.filter((item) => {
    const d = new Date(item[dateField]);
    if (key === 'today') return d >= todayStart;
    if (key === 'yesterday') return d >= yesterdayStart && d < todayStart;
    if (key === 'week') return d >= weekStart;
    return true;
  });
}

function AnalyticsView({ incidents, reports, units, logs, loading, config, onRefresh }) {
  const [timeFilter, setTimeFilter] = useState('today');
  const [search, setSearch] = useState('');

  // Stats computed from real data
  const totalReports = reports.length;
  const activeIncidents = incidents.filter((i) => i.status !== 'Closed' && i.status !== 'Resolved').length;
  // Units API primarily returns available units, we will show total tracked in this payload
  const availableUnits = units.length; 

  // Filtered audit logs for "Latest Updates"
  const filteredLogs = useMemo(() => {
    let result = filterByTimeRange(logs, timeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.action?.toLowerCase().includes(q) ||
          (log.actor_name || '').toLowerCase().includes(q) ||
          (log.entity_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, timeFilter, search]);

  // Open/assigned incidents for monitoring table
  const monitoredIncidents = incidents.filter((i) => i.status !== 'Closed');

  // Compute last 7 days report volume
  const last7Days = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return {
        date: d,
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        reports: 0,
      };
    });

    reports.forEach((r) => {
      if (!r.created_at) return;
      const rd = new Date(r.created_at);
      rd.setHours(0, 0, 0, 0);
      const day = days.find((d) => d.date.getTime() === rd.getTime());
      if (day) day.reports++;
    });

    return days;
  }, [reports]);

  if (loading) {
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

  return (
    <>
      {/* ── Top section: stats + latest updates ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: stat cards */}
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{totalReports}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{activeIncidents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Available Units</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {availableUnits}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart row */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex flex-col gap-1">
                <CardTitle>Report Volume Trend</CardTitle>
                <CardDescription>
                  Daily emergency reports over the last 7 days
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  reports: {
                    label: "Reports",
                    color: "var(--chart-1)",
                  },
                }}
                className="h-[250px] w-full"
              >
                <BarChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    fontSize={12} 
                    stroke="var(--muted-foreground)" 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    fontSize={12} 
                    stroke="var(--muted-foreground)" 
                  />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                  <Bar 
                    dataKey="reports" 
                    fill="var(--color-reports)" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40} 
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right: latest updates panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Latest Updates</CardTitle>
              <Button variant="outline" size="sm" onClick={onRefresh}>Refresh</Button>
            </div>
            {/* Time filter tabs */}
            <ToggleGroup
              value={[timeFilter]}
              onValueChange={(val) => {
                if (val && val[0]) setTimeFilter(val[0]);
              }}
              className="mt-2 flex w-full rounded-lg bg-secondary/40 p-1"
              spacing={1}
            >
              {TIME_FILTERS.map((f) => (
                <ToggleGroupItem
                  key={f.key}
                  value={f.key}
                  size="sm"
                  className="flex-1 rounded-md text-xs font-medium data-checked:bg-background data-checked:text-foreground data-checked:shadow-sm"
                >
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {/* Search */}
            <Field className="mt-2">
              <FieldLabel htmlFor="activity-search">Search activities</FieldLabel>
              <InputGroup className="h-9">
                <InputGroupAddon align="inline-start">
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  id="activity-search"
                  name="activitySearch"
                  type="search"
                  placeholder="Search activities"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Field>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px]">
            <p className="text-xs text-muted-foreground mb-3">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'activity' : 'activities'} {timeFilter === 'today' ? 'today' : timeFilter === 'yesterday' ? 'yesterday' : 'this week'}
            </p>
            <div className="flex flex-col gap-4">
              {filteredLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex gap-3 items-start">
                  <div className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{(log.action || '').replaceAll('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {log.entity_name} {log.entity_id?.toString().slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No activities found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Operational Configuration Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>DBSCAN Radius</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{config.dbscanEpsilonMeters} m</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Min Reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{config.dbscanMinPoints}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Reported Alert</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{config.reportedEscalationMinutes} min</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Validated Alert</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{config.validatedEscalationMinutes} min</div>
              </CardContent>
            </Card>
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Bottom: Incident Monitoring ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Incident Monitoring</CardTitle>
            <CardDescription>Active and assigned incidents.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Escalation Level</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitoredIncidents.map((incident) => (
                  <TableRow key={incident.id} className="border-border">
                    <TableCell>
                      <div className="font-semibold">{incident.emergency_type || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{incident.incident_code || incident.id?.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_VARIANT[incident.severity] || 'secondary'}>
                        {incident.severity || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{incident.report_count || 0}</TableCell>
                    <TableCell>
                      <StatusBadge status={incident.status || 'Reported'} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums">Level {incident.escalation_level || 0}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {new Date(incident.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>
          {monitoredIncidents.length === 0 && (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Activity />
                </EmptyMedia>
                <EmptyTitle>No active incidents</EmptyTitle>
                <EmptyDescription>All tracked incidents have been resolved or closed.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default AnalyticsView;
