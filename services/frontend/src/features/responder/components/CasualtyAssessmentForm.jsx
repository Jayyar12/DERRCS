import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { ChecklistGroup } from "./ChecklistGroup"
import { DrawerFooter } from "@/components/ui/drawer"

const injuryOptions = ['Laceration', 'Suspected fracture', 'Burn', 'Head trauma', 'Respiratory distress', 'Other'];
const interventionOptions = ['Wound dressing', 'Cervical collar', 'Splinting', 'CPR', 'Oxygen therapy', 'Other'];
const dispositions = ['TreatedOnScene', 'TransportedHealthCenter', 'TransportedNMMC', 'RefusedCare', 'Deceased'];

export function CasualtyAssessmentForm({ form, setForm, submitAssessment, saving }) {
  return (
    <form className="mt-4 pb-10" onSubmit={submitAssessment}>
      <div className="grid gap-6 sm:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="patient-name">Patient name or identity</FieldLabel>
            <Input id="patient-name" autoComplete="name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-age">Approximate age</FieldLabel>
            <Input id="patient-age" type="number" min="0" max="130" inputMode="numeric" value={form.approximateAge} onChange={(e) => setForm({ ...form, approximateAge: e.target.value })} />
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>Gender</FieldLabel>
            <Select value={form.gender || 'none'} onValueChange={(val) => setForm({ ...form, gender: val === 'none' ? '' : val })}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Not recorded" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Not recorded</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Consciousness (AVPU)</FieldLabel>
            <Select value={form.consciousnessLevel || 'none'} onValueChange={(val) => setForm({ ...form, consciousnessLevel: val === 'none' ? '' : val })}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Not recorded" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Not recorded</SelectItem>
                  {['Alert', 'Verbal', 'Pain', 'Unresponsive'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </div>

      <ChecklistGroup label="Injuries observed" options={injuryOptions} values={form.injuriesObserved} onChange={(injuriesObserved) => setForm({ ...form, injuriesObserved })} />
      <ChecklistGroup label="Interventions rendered" options={interventionOptions} values={form.interventionsRendered} onChange={(interventionsRendered) => setForm({ ...form, interventionsRendered })} />

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel>Disposition *</FieldLabel>
            <Select value={form.disposition} onValueChange={(val) => setForm({ ...form, disposition: val })} required>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Select disposition" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {dispositions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="destination">Destination facility</FieldLabel>
            <Input id="destination" value={form.destinationFacility} onChange={(e) => setForm({ ...form, destinationFacility: e.target.value })} />
          </Field>
        </FieldGroup>
      </div>

      <div className="mt-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="assessment-notes">Notes</FieldLabel>
            <Textarea id="assessment-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </FieldGroup>
      </div>

      <DrawerFooter className="px-0 mt-8">
        <Button size="lg" className="w-full py-6 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground" disabled={saving} type="submit">
          {saving ? (
            <>
              <Spinner data-icon="inline-start" />
              <span>Saving assessment…</span>
            </>
          ) : (
            'Submit Assessment and Resolve'
          )}
        </Button>
      </DrawerFooter>
    </form>
  );
}
