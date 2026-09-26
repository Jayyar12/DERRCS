import { Badge } from '@/components/ui/badge';
import { INCIDENT_STATUS_STYLES } from '@/lib/status';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className, ...props }) {
  const colorClass = INCIDENT_STATUS_STYLES[status] || 'bg-muted text-muted-foreground';

  return (
    <Badge
      variant="outline"
      className={cn('font-medium border-transparent', colorClass, className)}
      {...props}
    >
      {status}
    </Badge>
  );
}

export default StatusBadge;
