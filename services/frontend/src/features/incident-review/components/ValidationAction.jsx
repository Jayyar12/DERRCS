import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ValidationAction({ canValidate, onValidate, submitting }) {
  if (!canValidate) return null;

  return (
    <Button
      className="w-full"
      size="lg"
      onClick={onValidate}
      disabled={submitting}
    >
      {submitting ? (
        <>
          <Spinner data-icon="inline-start" />
          <span>Validating…</span>
        </>
      ) : (
        "Validate Incident"
      )}
    </Button>
  );
}
