import { OrganizationBrand } from '@/components/branding/OrganizationBrand';
import { cn } from '@/lib/utils';

export function PageHeader({ variant = 'staff', title, actions, children, className }) {
  const isPublic = variant === 'public';
  const actionContent = actions || children;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border transition-colors',
        isPublic
          ? 'bg-background/95 backdrop-blur px-4 py-4'
          : 'bg-card px-4 py-3 shadow-sm sm:px-6',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-4',
          isPublic ? 'mx-auto max-w-5xl' : 'w-full'
        )}
      >
        <OrganizationBrand pageTitle={title} tone={isPublic ? 'public' : 'application'} />
        {actionContent ? (
          <div className="flex items-center gap-3">{actionContent}</div>
        ) : null}
      </div>
    </header>
  );
}

export default PageHeader;
