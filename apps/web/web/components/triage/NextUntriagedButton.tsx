"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetNextUntriagedQuery } from "@/store/api/findingsApi";

interface NextUntriagedButtonProps {
  reviewId: string;
  onOpen: (findingId: string) => void;
}

export function NextUntriagedButton({ reviewId, onOpen }: NextUntriagedButtonProps) {
  const { data: next, isLoading } = useGetNextUntriagedQuery(reviewId);

  if (!next && !isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        All findings triaged
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isLoading || !next}
      onClick={() => next && onOpen(next.id)}
      className="gap-1.5"
    >
      Next untriaged
      <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}
