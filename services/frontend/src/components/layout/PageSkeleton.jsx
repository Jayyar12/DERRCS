import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function PageSkeleton({ className, ...props }) {
  return (
    <div
      className={cn('mx-auto w-full max-w-5xl px-4 py-8 flex flex-col gap-6 animate-pulse', className)}
      role="status"
      aria-label="Loading page content"
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default PageSkeleton;
