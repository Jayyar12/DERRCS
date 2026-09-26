import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ScrollText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';

function AuditView({ logs, loading, onRefresh }) {
  const [visibleCount, setVisibleCount] = useState(30);

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
        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollText />
              </EmptyMedia>
              <EmptyTitle>No audit entries yet</EmptyTitle>
              <EmptyDescription>
                System actions and status changes will appear here in chronological order.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <DataTable>
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
                  {logs.slice(0, visibleCount).map((log) => (
                    <TableRow key={log.id} className="border-border">
                      <TableCell className="font-semibold">{log.action}</TableCell>
                      <TableCell className="text-muted-foreground">{log.actor_name || 'System'}</TableCell>
                      <TableCell className="text-muted-foreground">{log.entity_name} {log.entity_id}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTable>

            {logs.length > visibleCount && (
              <Button
                variant="outline"
                size="sm"
                className="self-center"
                onClick={() => setVisibleCount((prev) => prev + 30)}
              >
                Load More ({logs.length - visibleCount} remaining)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AuditView;
