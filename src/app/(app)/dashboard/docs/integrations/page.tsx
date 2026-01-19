import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

export default async function IntegrationsDocsPage() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];

  const base = path.join(process.cwd(), "docs", "integrations");
  let files: string[] = [];
  try {
    files = (await fs.readdir(base)).filter((f) => f.endsWith(".md")).sort();
  } catch {
    files = [];
  }

  const docs = await Promise.all(
    files.map(async (f) => {
      const content = await fs.readFile(path.join(base, f), "utf8");
      return { file: f, content };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{locale === "pt" ? "Docs — Integrações" : "Docs — Integrations"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === "pt"
            ? "Guias por plataforma para configurares OAuth e pedires permissões/App Review."
            : "Per-platform guides to configure OAuth and request permissions/app review."}
        </p>
      </div>

      {docs.length ? (
        <div className="space-y-6">
          {docs.map((d) => (
            <section key={d.file} className="rounded-md border border-border/40 bg-card/60 p-4">
              <div className="text-sm font-semibold">{d.file}</div>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-muted-foreground">{d.content}</pre>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border/40 bg-card/60 p-4 text-sm text-muted-foreground">
          {locale === "pt" ? "Sem docs ainda." : "No docs yet."}
        </div>
      )}
    </div>
  );
}

