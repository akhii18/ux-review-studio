"use client";

import React, { useState, KeyboardEvent, ClipboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface MultiEmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

export function MultiEmailInput({
  emails,
  onChange,
  placeholder = "Add email and press Enter...",
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  };

  const addEmails = (rawEmails: string[]) => {
    const validEmails: string[] = [];
    let hasInvalid = false;

    for (const email of rawEmails) {
      const cleanEmail = email.trim();
      if (!cleanEmail) continue;
      if (validateEmail(cleanEmail)) {
        if (!emails.includes(cleanEmail)) {
          validEmails.push(cleanEmail);
        }
      } else {
        hasInvalid = true;
      }
    }

    if (validEmails.length > 0) {
      onChange([...emails, ...validEmails]);
    }

    if (hasInvalid) {
      setError("Some email addresses were invalid");
    } else {
      setError(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const parts = inputValue.split(/[\s,]+/);
      addEmails(parts);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      onChange(emails.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const parts = pastedText.split(/[\s,]+/);
    addEmails(parts);
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter((email) => email !== emailToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-1.5 border border-input bg-background rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {emails.map((email) => (
          <Badge
            key={email}
            variant="secondary"
            className="flex items-center gap-1 py-0.5 pr-1 pl-2 text-xs font-normal bg-secondary text-secondary-foreground"
          >
            {email}
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) {
              addEmails([inputValue]);
              setInputValue("");
            }
          }}
          placeholder={emails.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent border-0 p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-muted-foreground min-w-[140px]"
        />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
