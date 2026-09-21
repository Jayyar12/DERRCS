import { OrganizationBrand } from '@/components/branding/OrganizationBrand';

export function AppHeader({ title, actions }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-4 py-3 shadow-sm sm:px-6">
      <OrganizationBrand pageTitle={title} />
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}
