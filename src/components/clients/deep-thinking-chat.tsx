"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type DeepThinkingChatProps = {
  locale: Locale;
};

export function DeepThinkingChat({ locale }: DeepThinkingChatProps) {
  const t = copy[locale].clients.deepChat;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      {
        role: "assistant",
        content: t.assistantReply,
      },
    ]);
    setInput("");
  };

  return (
    <div className="space-y-4">
      <div className="min-h-[280px] rounded-md border border-border/40 bg-background/60 p-4">
        {messages.length ? (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto w-full max-w-2xl rounded-md border border-border/60 bg-muted/40 p-3 text-sm"
                    : "w-full max-w-2xl rounded-md border border-border/60 bg-card/60 p-3 text-sm"
                }
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {message.role === "user" ? t.you : t.assistant}
                </p>
                <p className="mt-2 text-sm text-foreground">{message.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t.emptyState}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          rows={3}
          placeholder={t.placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" className="bg-brand text-primary-foreground">
            {t.send}
          </Button>
        </div>
      </form>
    </div>
  );
}
