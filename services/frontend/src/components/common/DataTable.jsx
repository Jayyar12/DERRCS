import { cn } from '@/lib/utils';

export function DataTable({ className, children, ...props }) {
  return (
    <div
      className={cn('w-full overflow-x-auto rounded-md border border-border bg-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default DataTable;
