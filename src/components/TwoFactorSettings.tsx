"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, Copy, Download, KeyRound, ShieldCheck } from "lucide-react";

type Props = {
  enabled: boolean;
  recoveryCodesLeft: number;
  /** Partners and customers may turn it off; admins and owners may not. */
  canDisable: boolean;
  accountEmail: string;
  /** Where to go once setup is finished (e.g. back to the admin). */
  doneHref?: string;
};

const field =
  "min-h-[44px] w-full rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

function RecoveryCodes({ codes, accountEmail, onDone }: { codes: string[]; accountEmail: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const text = `NOBYST GLOBAL recovery codes for ${accountEmail}\nEach code works once.\n\n${codes.join("\n")}\n`;
  return (
    <div>
      <p className="text-sm text-navy/75">
        Save these recovery codes somewhere safe, away from your phone. If you lose your phone, each
        code signs you in once. <strong>They are shown only now.</strong>
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm text-navy">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(text).then(() => setSaved(true))}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-navy/20 px-3 text-xs font-bold text-navy"
        >
          <Copy size={14} /> Copy
        </button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
          download="nobyst-recovery-codes.txt"
          onClick={() => setSaved(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-navy/20 px-3 text-xs font-bold text-navy"
        >
          <Download size={14} /> Download
        </a>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I have saved my recovery codes
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={onDone}
        className="mt-4 min-h-[44px] w-full rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-royal disabled:opacity-50"
      >
        Done
      </button>
    </div>
  );
}

/** Set up, review or turn off two-step sign-in with an authenticator app. */
export default function TwoFactorSettings({ enabled, recoveryCodesLeft, canDisable, accountEmail, doneHref }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "scan" | "codes" | "regenerate" | "disable">("idle");
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!setup) return;
    QRCode.toDataURL(setup.uri, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [setup]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const finish = () => {
    setStage("idle");
    setCodes([]);
    setCode("");
    if (doneHref) router.replace(doneHref);
    router.refresh();
  };

  if (stage === "codes") return <RecoveryCodes codes={codes} accountEmail={accountEmail} onDone={finish} />;

  if (stage === "scan" && setup) {
    return (
      <div className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-navy/75">
          <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password).</li>
          <li>Add an account and scan this QR code.</li>
          <li>Type the 6-digit code the app shows.</li>
        </ol>
        <div className="flex flex-col items-center gap-2">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code for your authenticator app" width={220} height={220} className="rounded-xl border border-navy/10" />
          ) : (
            <div className="h-[220px] w-[220px] animate-pulse rounded-xl bg-navy/5" aria-hidden />
          )}
          <p className="text-center text-xs text-navy/60">
            Can&apos;t scan? Enter this key instead:
            <br />
            <code className="break-all font-mono text-sm font-bold text-navy">{setup.secret.match(/.{1,4}/g)?.join(" ")}</code>
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await post<{ recoveryCodes: string[] }>("/api/auth/two-factor/enable", { code });
              setCodes(r.recoveryCodes);
              setStage("codes");
            });
          }}
          className="space-y-3"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-label="6-digit code"
            className={field}
          />
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="min-h-[44px] w-full rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-royal disabled:opacity-50"
          >
            {busy ? "Checking…" : "Turn on two-step sign-in"}
          </button>
        </form>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-navy/75">
          After your password, you will also enter a 6-digit code from an app on your phone. Someone who
          learns your password still cannot sign in.
        </p>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              setSetup(await post<{ secret: string; uri: string }>("/api/auth/two-factor/setup"));
              setStage("scan");
            })
          }
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-royal disabled:opacity-60"
        >
          <ShieldCheck size={16} /> {busy ? "Starting…" : "Set up two-step sign-in"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
        <CheckCircle2 size={18} /> Two-step sign-in is on.
      </p>
      <p className="text-sm text-navy/70">
        {recoveryCodesLeft} of 10 recovery codes left.
        {recoveryCodesLeft <= 3 && " Generate a new set soon."}
      </p>
      {stage === "regenerate" || stage === "disable" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              if (stage === "regenerate") {
                const r = await post<{ recoveryCodes: string[] }>("/api/auth/two-factor/recovery-codes", { code });
                setCodes(r.recoveryCodes);
                setStage("codes");
              } else {
                await post("/api/auth/two-factor/disable", { code });
                setStage("idle");
                setCode("");
                router.refresh();
              }
            });
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-bold text-navy">
            {stage === "regenerate" ? "Current code from your app" : "Code from your app (or a recovery code)"}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 20))}
              inputMode={stage === "regenerate" ? "numeric" : "text"}
              autoComplete="one-time-code"
              className={`${field} mt-1`}
            />
          </label>
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !code}
              className={`min-h-[42px] rounded-full px-5 text-sm font-bold text-white disabled:opacity-50 ${
                stage === "disable" ? "bg-rose-600 hover:bg-rose-700" : "bg-navy hover:bg-royal"
              }`}
            >
              {stage === "regenerate" ? "Generate new codes" : "Turn off"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("idle");
                setCode("");
                setError(null);
              }}
              className="min-h-[42px] rounded-full border border-navy/20 px-5 text-sm font-bold text-navy"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStage("regenerate")}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-navy/20 px-5 text-sm font-bold text-navy"
          >
            <KeyRound size={15} /> New recovery codes
          </button>
          {canDisable && (
            <button
              type="button"
              onClick={() => setStage("disable")}
              className="min-h-[42px] rounded-full px-5 text-sm font-bold text-rose-600 hover:bg-rose-50"
            >
              Turn off
            </button>
          )}
        </div>
      )}
    </div>
  );
}
