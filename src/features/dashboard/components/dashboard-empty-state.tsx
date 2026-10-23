import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/async-states";
import { Activity } from "lucide-react";

export function DashboardEmptyState() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/8 text-brand">
            <Activity aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Delivery activity</h2>
            <p className="mt-0.5 text-xs text-muted">
              A live view of your operation
            </p>
          </div>
        </div>
      </CardHeader>
      <EmptyState
        title="Your overview is ready"
        description="Once delivery data is connected, this space will show the activity and progress that matter to your operation."
      />
    </Card>
  );
}
