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
    // Shown immediately so the upload has something to happen to, rather
    // than the old picture sitting there looking like nothing was clicked.
    setPreview(URL.createObjectURL(file));
    upload.execute({ file });
  }

  const busy = upload.isExecuting || clear.isExecuting;
  const error =
    upload.result.serverError ??
    clear.result.serverError ??
    upload.result.validationErrors?.file?._errors?.[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <Avatar name={name} src={preview ?? avatarUrl} size={72} round />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              size="sm"
              icon="ant-design:upload-outlined"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              {upload.isExecuting ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {avatarUrl ? (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => clear.execute(undefined)}>
                {clear.isExecuting ? "Removing…" : "Remove"}
              </Button>
            ) : null}
          </div>
          <span className="piq-caption">PNG, JPEG, WEBP or GIF · up to 2MB</span>
        </div>

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

      <FormError>{error}</FormError>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 380 }}>
        <span className="piq-caption">Display name</span>
        <input className="piq-input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <FormError>
        {rename.result.serverError ?? rename.result.validationErrors?.name?._errors?.[0]}
      </FormError>

      <div>
        <Button
          size="sm"
          disabled={rename.isExecuting || name.trim() === initialName || name.trim().length < 2}
          onClick={() => rename.execute({ name: name.trim() })}
        >
          {rename.isExecuting ? "Saving…" : "Save name"}
        </Button>
      </div>

      <div className="piq-caption" style={{ lineHeight: 1.6 }}>
        Signed in as {email} · {roleLabel}. Your email and role are set by an admin, not here.
      </div>
    </div>
  );
}
