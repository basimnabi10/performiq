"use client";

import * as React from "react";

export interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  label: string;
  /** Iconify icon rendered inside the input's left gutter. */
  icon?: string;
  /** Renders the field in its error state. */
  invalid?: boolean;
  /** Small helper line under the input. */
  hint?: string;
  /** Node pinned inside the input's right gutter (e.g. a reveal toggle). */
  trailing?: React.ReactNode;
}

/**
 * The canonical auth text input: label, optional leading icon, and a visible
 * focus ring. Every /(auth) form used to repeat this styling inline, which is
 * why the focus and error states were missing from half of them.
 */
export function Field({ label, icon, invalid, hint, trailing, id, ...rest }: FieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={inputId} className="piq-caption" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {/* The relative box wraps the input alone, so anything in a gutter stays
          centred on the control no matter how the label or hint wraps. */}
      <div style={{ position: "relative", display: "flex" }}>
        {icon ? (
          <iconify-icon
            icon={icon}
            width={15}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-placeholder)",
              pointerEvents: "none",
            }}
          />
        ) : null}
        <input
          id={inputId}
          className={invalid ? "piq-input piq-input-invalid" : "piq-input"}
          aria-invalid={invalid || undefined}
          style={{ paddingLeft: icon ? 40 : 14, paddingRight: trailing ? 42 : 14 }}
          {...rest}
        />
        {trailing}
      </div>
      {hint ? (
        <span className="piq-caption" style={{ fontSize: 11.5 }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export type PasswordFieldProps = Omit<FieldProps, "icon" | "type" | "trailing"> & {
  /** Noun used in the toggle's accessible name, e.g. "new password". */
  toggleLabel?: string;
};

/**
 * Password input with a show/hide toggle. The toggle is a real <button> with
 * aria-pressed rather than an icon-shaped div, so it's keyboard reachable and
 * announced -- and type="button", so it can never submit the form it sits in.
 */
export function PasswordField({ toggleLabel = "password", ...props }: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const action = visible ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`;

  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      icon="ant-design:lock-outlined"
      trailing={
        <button
          type="button"
          className="piq-reveal"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={action}
          title={action}
        >
          <iconify-icon
            icon={visible ? "ant-design:eye-invisible-outlined" : "ant-design:eye-outlined"}
            width={16}
          />
        </button>
      }
    />
  );
}
