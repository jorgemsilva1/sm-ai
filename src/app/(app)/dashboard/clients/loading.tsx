import { Card } from "@/components/ui/card";

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 rounded bg-muted/60" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/40 bg-card/80 p-5">
            <div className="space-y-3">
              <div className="h-4 w-40 rounded bg-muted/60" />
              <div className="h-3 w-28 rounded bg-muted/50" />
              <div className="h-3 w-24 rounded bg-muted/50" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
