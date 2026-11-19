"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password field with a show/hide button, like most modern apps. The text is hidden by default
 * and hidden again when the field loses focus to another field, so it is not left on screen.
 */
export default function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  // Margins belong on the wrapper, so the eye button stays centred on the field itself.
  const margin = className.split(/\s+/).filter((c) => /^-?m[tybxlr]?-/.test(c)).join(" ");
  const rest = className.split(/\s+/).filter((c) => c && !/^-?m[tybxlr]?-/.test(c)).join(" ");
  return (
    <span className={`relative block ${margin}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${rest} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-navy/50 hover:text-navy focus-visible:outline-royal"
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </span>
  );
}
