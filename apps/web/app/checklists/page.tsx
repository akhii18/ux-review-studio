import { AppHeader } from "@/components/ui/AppHeader";
import { ChecklistGrid } from "@/components/checklist/ChecklistGrid";

export const metadata = { title: "Checklists — UXNavigator" };

export default function ChecklistsPage() {
  return (
    <>
      <AppHeader
        title="Checklists"
        subtitle="Manage governance checklists with versioning and approval workflows"
      />
      <div className="flex-1 p-4 md:p-6">
        <ChecklistGrid />
      </div>
    </>
  );
}
