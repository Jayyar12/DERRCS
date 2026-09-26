import { cn } from '@/lib/utils';

export function SectionHeader({ icon: Icon, className, children, ...props }) {
  return (
    <h3
      className={cn('text-base font-semibold mb-2 flex items-center gap-2 text-foreground', className)}
      {...props}
    >
      {Icon && <Icon className="size-5 text-primary shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </h3>
  );
}

export default SectionHeader;
