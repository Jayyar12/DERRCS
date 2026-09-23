import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CasualtyAssessmentForm } from "./CasualtyAssessmentForm"

export function FieldAssessmentDrawer({ isOpen, setIsOpen, form, setForm, submitAssessment, saving, error }) {
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger render={<Button size="lg" className="w-full mt-6 text-lg py-8 font-bold bg-success hover:bg-success/90 text-success-foreground" />}>
        Complete Field Assessment
      </DrawerTrigger>
      <DrawerContent className="max-h-[96svh]">
        <ScrollArea className="overflow-auto">
          <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
            <DrawerHeader className="px-0 pt-0 text-left">
              <DrawerTitle className="text-2xl">Field Casualty Assessment</DrawerTitle>
              <DrawerDescription>Complete the pre-hospital care report to resolve this incident.</DrawerDescription>
            </DrawerHeader>
            {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
            <CasualtyAssessmentForm form={form} setForm={setForm} submitAssessment={submitAssessment} saving={saving} />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
