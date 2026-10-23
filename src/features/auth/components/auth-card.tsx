import Link from "next/link";
import type { ReactNode } from "react";
import { PackageCheck } from "lucide-react";

type AuthCardProps = {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
};

export function AuthCard({
  children,
  description,
  footer,
  title,
}: AuthCardProps) {
  return (
    <main className="min-h-screen bg-[#f4f5f1] p-4 sm:p-8 lg:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[0_24px_80px_-42px_rgba(18,45,39,.3)] sm:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#142f2c] p-10 text-white lg:flex xl:p-14">
          <div aria-hidden="true" className="hero-grain absolute inset-0" />
          <div aria-hidden="true" className="auth-orbit absolute -bottom-28 -right-44 size-[34rem] rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-8 top-8 size-72 rounded-full bg-[#79a98c]/15 blur-3xl" />
          <Link href="/login" className="relative flex items-center gap-3" aria-label="Wayline">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#c7e2aa] text-[#183630]">
              <PackageCheck aria-hidden="true" size={20} strokeWidth={2.2} />
            </span>
            <span className="text-lg font-semibold tracking-tight">wayline</span>
          </Link>
          <div className="relative max-w-lg py-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#c7e2aa]">
              Operations, with intention
            </p>
            <h1 className="mt-5 text-5xl font-medium leading-[1.06] tracking-[-0.055em] xl:text-[3.65rem]">
              Every route has
              <br /> a reason.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
              One considered workspace for your products, delivery zones, and
              the orders that bring them together.
            </p>
          </div>
          <div className="relative flex items-center justify-between border-t border-white/15 pt-5 text-[10px] tracking-wide text-white/45">
            <span>DELIVERY CONTROL, REFINED</span>
            <span>WAYLINE © 2026</span>
          </div>
        </section>
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <Link
              href="/login"
              className="mb-8 flex items-center justify-center gap-3 lg:hidden"
              aria-label="Wayline"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                <PackageCheck aria-hidden="true" size={20} strokeWidth={2.2} />
              </span>
              <span className="text-lg font-semibold tracking-tight text-ink">
                wayline
              </span>
            </Link>
            <p className="mb-3 hidden font-mono text-[10px] uppercase tracking-[0.19em] text-brand lg:block">
              Your workspace awaits
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.8rem]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            <div className="mt-7">{children}</div>
            {footer ? (
              <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
                {footer}
              </div>
            ) : null}
            <p className="mt-7 text-center text-[11px] text-muted">
              Secure access to your delivery workspace
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
