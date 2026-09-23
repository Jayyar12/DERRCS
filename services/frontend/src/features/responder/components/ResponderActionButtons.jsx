import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function ResponderActionButtons({ status, saving, updateStatus }) {
  const canMarkEnRoute = ['Dispatched', 'Acknowledged'].includes(status);
  const canMarkOnScene = ['Dispatched', 'Acknowledged', 'EnRoute'].includes(status);

  if (!canMarkEnRoute && !canMarkOnScene) return null;

  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3">
      {canMarkEnRoute && (
        <Button size="lg" className="w-full text-lg py-8 font-bold bg-primary hover:bg-primary/90" disabled={saving} onClick={() => updateStatus('EnRoute')}>
          {saving ? (
            <>
              <Spinner data-icon="inline-start" />
              <span>Updating status...</span>
            </>
          ) : (
            'Mark En Route'
          )}
        </Button>
      )}
      {canMarkOnScene && (
        <Button size="lg" className="w-full text-lg py-8 font-bold bg-destructive hover:bg-destructive/90" disabled={saving} onClick={() => updateStatus('OnScene')}>
          {saving ? (
            <>
              <Spinner data-icon="inline-start" />
              <span>Recording arrival...</span>
            </>
          ) : (
            'Arrived on Scene'
          )}
        </Button>
      )}
    </div>
  );
}
