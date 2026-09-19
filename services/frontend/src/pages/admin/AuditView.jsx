import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

function AuditView({ logs, onRefresh }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Recent Audit Activity</CardTitle>
          <CardDescription>System-wide action log.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>Refresh</Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.slice(0, 30).map((log) => (
                <TableRow key={log.id} className="border-border">
                  <TableCell className="font-semibold">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">{log.actor_name || 'System'}</TableCell>
                  <TableCell className="text-muted-foreground">{log.entity_name} {log.entity_id}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {logs.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">No audit entries yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default AuditView;
