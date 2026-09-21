import { OrganizationBrand } from '@/components/branding/OrganizationBrand';

export function PublicPageHeader({ title, actions }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <OrganizationBrand pageTitle={title} tone="public" />
        {actions}
      </div>
    </header>
  );
}
