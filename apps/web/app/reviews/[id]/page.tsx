import { AppHeader } from "@/components/ui/AppHeader";
import { FindingsPanel } from "@/components/triage/FindingsPanel";

export const metadata = { title: "Review Workspace — UXNavigator" };

export default function ReviewPage({ params }: { params: { id: string } }) {
  return (
    <>
      <AppHeader
        title="Review Workspace"
        subtitle={`Review ID: ${params.id}`}
      />
      <div className="flex-1 p-4 md:p-6">
        <FindingsPanel reviewId={params.id} />
      </div>
    </>
  );
}
