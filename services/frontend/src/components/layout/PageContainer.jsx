import { cn } from '@/lib/utils';

export function PageContainer({ maxWidth = '5xl', className, children, ...props }) {
  const widthClass = {
    '2xl': 'max-w-2xl',
    '5xl': 'max-w-5xl',
    '7xl': 'max-w-7xl',
    full: '',
  }[maxWidth] || 'max-w-5xl';

  return (
    <main
      className={cn('mx-auto w-full px-4 py-6 sm:px-6', widthClass, className)}
      id="main-content"
      tabIndex={-1}
      {...props}
    >
      {children}
    </main>
  );
}

export default PageContainer;
