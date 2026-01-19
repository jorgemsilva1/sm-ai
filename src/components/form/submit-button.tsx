"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  loadingText = "A guardar...",
  className,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className={className} disabled={pending || disabled}>
      {pending ? loadingText : children}
    </Button>
  );
}
