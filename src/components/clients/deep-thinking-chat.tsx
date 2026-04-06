"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsThinking(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t.assistantReply },
      ]);
      setIsThinking(false);
    }, 1200);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-[560px] flex-col rounded-xl border border-border/20 bg-surface-1">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length ? (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[80%] rounded-xl border border-brand/20 bg-brand/10 p-3 text-sm"
                    : "max-w-[80%] rounded-xl border border-border/20 bg-surface-2 p-3 text-sm"
                }
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {message.role === "user" ? t.you : t.assistant}
                </p>
                <p className="mt-1.5 text-sm text-foreground">{message.content}</p>
              </div>
            ))}
            {isThinking && (
              <div className="max-w-[80%] rounded-xl border border-border/20 bg-surface-2 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.assistant}
                </p>
                <div className="mt-2 flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t.emptyState}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border/20 glass-strong p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <Textarea
            rows={2}
            placeholder={t.placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none"
          />
          <Button type="submit" variant="brand" disabled={isThinking || !input.trim()}>
            {t.send}
          </Button>
        </form>
        <p className="mt-1.5 text-xs text-muted-foreground/50">
          {locale === "pt" ? "Ctrl+Enter para enviar" : "Ctrl+Enter to send"}
        </p>
      </div>
    </div>
  );
}
