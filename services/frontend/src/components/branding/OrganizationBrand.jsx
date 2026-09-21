import { cn } from '@/lib/utils';

export const ORGANIZATION_NAME = 'TAGOLOAN MDRRMO';

const toneClasses = {
  application: 'text-xs text-warning',
  public: 'text-sm text-muted-foreground uppercase',
};

export function OrganizationBrand({ pageTitle, tone = 'application', showLogos = true }) {
  return (
    <div className="flex items-center gap-3">
      {showLogos && (
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/logo-tagoloan.png"
            alt="Tagoloan Municipality Logo"
            className="size-9 object-contain drop-shadow-sm sm:size-10"
          />
          <img
            src="/logo-mdrrmo.png"
            alt="MDRRMO Logo"
            className="size-9 object-contain drop-shadow-sm sm:size-10"
          />
        </div>
      )}
      <div>
        <p className={cn('font-bold tracking-widest', toneClasses[tone])}>
          {ORGANIZATION_NAME}
        </p>
        <h1 className="text-xl font-bold leading-tight">{pageTitle}</h1>
      </div>
    </div>
  );
}

export function OrganizationHero() {
  return (
    <div className="-mt-6 mb-8 flex w-full max-w-4xl flex-col items-center justify-center gap-4 text-center">
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <img
          src="/logo-tagoloan.png"
          alt="Tagoloan Municipality Logo"
          className="size-24 shrink-0 object-contain drop-shadow-md md:size-28"
        />
        <img
          src="/logo-mdrrmo.png"
          alt="MDRRMO Logo"
          className="size-24 shrink-0 object-contain drop-shadow-md md:size-28"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-widest text-foreground md:text-4xl">
          {ORGANIZATION_NAME}
        </h1>
        <p className="text-xs font-bold uppercase tracking-widest text-warning sm:text-sm md:text-base">
          Disaster Risk Reduction &amp; Management
        </p>
      </div>
    </div>
  );
}
