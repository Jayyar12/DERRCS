import { FieldSet, FieldLegend, Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

export function ChecklistGroup({ label, options, values, onChange }) {
  return (
    <FieldSet className="mt-6">
      <FieldLegend>{label}</FieldLegend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <Field
            key={option}
            orientation="horizontal"
            className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors bg-card justify-start"
          >
            <Checkbox 
              id={`chk-${option}`}
              checked={values.includes(option)} 
              onCheckedChange={(checked) => onChange(checked ? [...values, option] : values.filter((value) => value !== option))} 
              className="size-5"
            />
            <FieldLabel htmlFor={`chk-${option}`} className="text-sm font-medium cursor-pointer">{option}</FieldLabel>
          </Field>
        ))}
      </div>
    </FieldSet>
  );
}
