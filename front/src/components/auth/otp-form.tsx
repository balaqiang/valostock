"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/** 6-digit OTP input + resend timer (docs/SITEMAP.md §2) — verification via API later. */
export function OtpForm() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((value) => value - 1), 1_000);
    return () => clearInterval(timer);
  }, [seconds]);

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onPaste = (event: React.ClipboardEvent) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setDigits(
      Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? ""),
    );
    inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const complete = digits.every((digit) => digit !== "");

  return (
    <form className="mt-6" onSubmit={(event) => event.preventDefault()}>
      <div className="flex justify-between gap-2" onPaste={onPaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1}`}
            value={digit}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            className="num h-13 w-full max-w-13 rounded-lg border border-border bg-background text-center font-display text-xl font-bold text-text transition-colors duration-200 focus:border-primary focus:outline-none"
          />
        ))}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        disabled={!complete}
      >
        Verifikasi
      </Button>

      <p className="mt-4 text-center text-sm text-text-secondary">
        {seconds > 0 ? (
          <>
            Kirim ulang kode dalam{" "}
            <span className="num font-medium text-text">{seconds}s</span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSeconds(RESEND_SECONDS)}
            className="font-medium text-primary hover:text-primary-hover"
          >
            Kirim ulang kode
          </button>
        )}
      </p>
    </form>
  );
}
