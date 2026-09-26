import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export function AsyncButton({
  loading = false,
  loadingText,
  disabled,
  children,
  className,
  ...props
}) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn('relative', className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner data-icon="inline-start" className="mr-2" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export default AsyncButton;
