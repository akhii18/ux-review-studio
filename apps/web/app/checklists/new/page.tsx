import { AppHeader } from "@/components/ui/AppHeader";
import { ChecklistForm } from "@/components/checklist/ChecklistForm";

export const metadata = { title: "New Checklist — UXNavigator" };

export default function NewChecklistPage() {
  return (
    <>
      <AppHeader
        title="Create checklist"
        subtitle="Define items, assign areas, and set governance requirements"
      />
      <div className="flex-1 p-4 md:p-6 max-w-2xl">
        <ChecklistForm />
      </div>
    </>
  );
}
