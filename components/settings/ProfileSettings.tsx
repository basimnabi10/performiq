"use client";

import { useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { removeMyAvatar, updateMyName, uploadMyAvatar } from "@/actions/profile";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormMessage";

/**
 * Your own name and photo. Everyone has one of these, whatever their role —
 * and nobody edits anyone else's, so there is no id to pass: the actions read
 * the member from the session.
 *
 * Laid out as the sections beneath it are: one column, a field at a time, so
 * Settings reads as one page rather than three that were written separately.
 */
export function ProfileSettings({
  name: initialName,
  avatarUrl,
  email,
  roleLabel,
}: {
  name: string;
  avatarUrl: string | null;
  email: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [preview, setPreview] = useState<string | null>(null);

  const refresh = () => {
    setPreview(null);
    router.refresh();
  };

  const upload = useAction(uploadMyAvatar, { onSuccess: refresh });
  const clear = useAction(removeMyAvatar, { onSuccess: refresh });
  const rename = useAction(updateMyName, { onSuccess: () => router.refresh() });

  function choose(file: File | undefined) {
    if (!file) return;
    // Shown at once so the upload has something to happen to, rather than the
    // old picture sitting there looking like nothing was clicked.
    setPreview(URL.createObjectURL(file));
    upload.execute({ file });
  }

  const busy = upload.isExecuting || clear.isExecuting;
  const photoError =
    upload.result.serverError ??
    clear.result.serverError ??
    upload.result.validationErrors?.file?._errors?.[0];
  const nameError = rename.result.serverError ?? rename.result.validationErrors?.name?._errors?.[0];
  const nameChanged = name.trim() !== initialName;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 420 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Photo</span>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={name} src={preview ?? avatarUrl} size={64} round />

          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                size="sm"
                icon="ant-design:upload-outlined"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                {upload.isExecuting ? "Uploading…" : avatarUrl ? "Change" : "Upload"}
              </Button>
              {avatarUrl ? (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => clear.execute(undefined)}>
                  {clear.isExecuting ? "Removing…" : "Remove"}
                </Button>
              ) : null}
            </div>
            <span className="piq-caption">PNG, JPEG, WEBP or GIF · up to 2MB</span>
          </div>
        </div>

        <FormError>{photoError}</FormError>

        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => {
            choose(e.target.files?.[0]);
            // Cleared so picking the same file twice still fires a change.
            e.target.value = "";
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Display name</span>
          <input className="piq-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <FormError>{nameError}</FormError>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            size="sm"
            disabled={rename.isExecuting || !nameChanged || name.trim().length < 2}
            onClick={() => rename.execute({ name: name.trim() })}
          >
            {rename.isExecuting ? "Saving…" : "Save name"}
          </Button>
          {!nameChanged && rename.result.data ? <span className="piq-caption">Saved.</span> : null}
        </div>
      </div>

      <div className="piq-caption" style={{ lineHeight: 1.6 }}>
        Signed in as {email} · {roleLabel}. Your email and role are set by an admin, not here.
      </div>
    </div>
  );
}
