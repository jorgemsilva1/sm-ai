"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type SubmitButtonProps = {
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
} & VariantProps<typeof buttonVariants>;

export function SubmitButton({
  children,
  loadingText,
  className,
  disabled = false,
  variant,
  size,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
