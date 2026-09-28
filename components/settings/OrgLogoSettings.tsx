"use client";

import { useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { removeOrgLogo, uploadOrgLogo } from "@/actions/profile";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormMessage";
import { OrgMark } from "@/components/layout/OrgMark";

/** The one image everybody in the organization sees, so admins only. */
export function OrgLogoSettings({ logoUrl, orgName }: { logoUrl: string | null; orgName: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const refresh = () => {
    setPreview(null);
    router.refresh();
  };

  const upload = useAction(uploadOrgLogo, { onSuccess: refresh });
  const clear = useAction(removeOrgLogo, { onSuccess: refresh });

  const busy = upload.isExecuting || clear.isExecuting;
  const error =
    upload.result.serverError ??
    clear.result.serverError ??
    upload.result.validationErrors?.file?._errors?.[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Logo</span>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <OrgMark src={preview ?? logoUrl} name={orgName} size={48} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              size="sm"
              icon="ant-design:upload-outlined"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              {upload.isExecuting ? "Uploading…" : logoUrl ? "Change" : "Upload"}
            </Button>
            {logoUrl ? (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => clear.execute(undefined)}>
                {clear.isExecuting ? "Removing…" : "Remove"}
              </Button>
            ) : null}
          </div>
          <span className="piq-caption">Shown in the sidebar for everyone · up to 2MB</span>
        </div>
      </div>

      <FormError>{error}</FormError>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPreview(URL.createObjectURL(file));
            upload.execute({ file });
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
