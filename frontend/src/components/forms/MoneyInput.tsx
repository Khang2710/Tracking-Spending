import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { formatMoneyDraft, normalizeMoneyDraft, parseMoneyDraft } from "./moneyInputModel";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "value" | "onChange"> & {
  value: number | null;
  onValueChange(value: number | null): void;
  requiredAmount?: boolean;
};

export function MoneyInput({ value, onValueChange, requiredAmount = false, onBlur, onFocus, ...props }: MoneyInputProps) {
  const [draft, setDraft] = useState(() => formatMoneyDraft(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(formatMoneyDraft(value));
  }, [value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(event) => {
        const nextDraft = normalizeMoneyDraft(event.target.value);
        setDraft(nextDraft);
        onValueChange(parseMoneyDraft(nextDraft));
      }}
      onFocus={(event) => {
        focusedRef.current = true;
        if (draft === "0") event.currentTarget.select();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focusedRef.current = false;
        const parsed = parseMoneyDraft(draft);
        if (parsed === null && requiredAmount) {
          setDraft("0");
          onValueChange(0);
        } else {
          setDraft(formatMoneyDraft(parsed));
        }
        onBlur?.(event);
      }}
    />
  );
}
