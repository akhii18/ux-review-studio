"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MultiEmailInput } from "@/components/ui/MultiEmailInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEscalateFindingMutation } from "@/store/api/findingsApi";
import { toast } from "sonner";
import { X } from "lucide-react";

const PREDEFINED_RECIPIENTS = [
  { id: "rakhee", name: "Rakhee Srivastava", role: "UX Lead", email: "rakhee.srivastava@techmahindra.com" },
  { id: "durga", name: "Durga Vara Mahanthi", role: "Senior UX Reviewer", email: "durgavara.mahanthi@techmahindra.com" },
  { id: "shivesh", name: "Shivesh Kaushik", role: "Dev Team", email: "sx001194733@techmahindra.com" },
  { id: "anshuman", name: "Anshuman Biswal", role: "Dev Team", email: "anshuman.biswal@techmahindra.com" },
  { id: "mohit", name: "Mohit Mishra", role: "Dev Team", email: "mohit.mishra7@techmahindra.com" },
  { id: "dhanush", name: "Kamatam Dhanush", role: "Dev Team", email: "kamatam.dhanush@techmahindra.com" },
];

interface EscalateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingId: string;
  findingTitle: string;
  onEscalated?: () => void;
}

export function EscalateDialog({
  open,
  onOpenChange,
  findingId,
  findingTitle,
  onEscalated,
}: EscalateDialogProps) {
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [escalateFinding, { isLoading }] = useEscalateFindingMutation();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedRecipientIds([]);
      setCustomEmails([]);
      setComment("");
    }
  }, [open]);

  const selectedRecipients = PREDEFINED_RECIPIENTS.filter((recipient) =>
    selectedRecipientIds.includes(recipient.id),
  );

  const addPredefinedRecipient = (recipientId: string) => {
    if (!selectedRecipientIds.includes(recipientId)) {
      setSelectedRecipientIds([...selectedRecipientIds, recipientId]);
    }
  };

  const removePredefinedRecipient = (recipientId: string) => {
    setSelectedRecipientIds(selectedRecipientIds.filter((id) => id !== recipientId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emails = Array.from(new Set([
      ...selectedRecipients.map((recipient) => recipient.email),
      ...customEmails,
    ]));

    if (emails.length === 0) {
      toast.error("Please select at least one recipient or add an email address");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please provide an escalation note");
      return;
    }

    try {
      await escalateFinding({
        id: findingId,
        payload: {
          emails,
          recipients: [
            ...selectedRecipients.map((recipient) => ({
              label: `${recipient.name} - ${recipient.role}`,
              email: recipient.email,
            })),
            ...customEmails.map((email) => ({ label: email, email })),
          ],
          reason: comment.trim(),
        },
      }).unwrap();

      toast.success("Finding escalated successfully");
      onOpenChange(false);
      if (onEscalated) {
        onEscalated();
      }
    } catch (error: any) {
      toast.error(error?.data?.error ?? "Failed to escalate finding");
      console.error("Escalation error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border border-border">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-foreground text-left">
            Escalate finding
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-left">
            Route to a lead reviewer for a final call. They'll be notified by email and in-app.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Email Tags Field */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-foreground">
              Assign to
            </label>
            <Select value="" onValueChange={addPredefinedRecipient}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select from predefined reviewers..." />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_RECIPIENTS.map((recipient) => (
                  <SelectItem
                    key={recipient.id}
                    value={recipient.id}
                    disabled={selectedRecipientIds.includes(recipient.id)}
                    className="text-xs"
                  >
                    {recipient.name} - {recipient.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedRecipients.map((recipient) => (
                  <Badge
                    key={recipient.id}
                    variant="secondary"
                    className="flex items-center gap-1 py-0.5 pr-1 pl-2 text-xs font-normal bg-secondary text-secondary-foreground"
                  >
                    {recipient.name} - {recipient.role}
                    <button
                      type="button"
                      onClick={() => removePredefinedRecipient(recipient.id)}
                      className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">Or add email addresses manually.</p>
            <MultiEmailInput
              emails={customEmails}
              onChange={setCustomEmails}
              placeholder="Type email address and press Enter..."
            />
          </div>

          {/* Comment/Note Field */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-foreground">
              Note (optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why are you escalating? Any context that helps triage..."
              className="text-xs min-h-[90px] resize-none bg-background border-input"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs border border-input hover:bg-secondary/40 text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "Escalating..." : "Escalate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
