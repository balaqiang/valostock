import type { Metadata } from "next";
import {
  BadgeCheck,
  CircleUserRound,
  Globe,
  KeyRound,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiForm } from "@/components/dashboard/api-form";
import { PageHeader } from "@/components/account/bits";
import { requireUser } from "@/lib/auth";
import { customerIdFor, formatDbDateTime } from "@/lib/format";

// Buyers never need identity verification; 2FA/OTP is future work.
const IDENTITY_VERIFIED = false;

export const metadata: Metadata = {
  title: "Profil Saya | valostock.id",
};

function ProfileBlock({
  icon: Icon,
  title,
  children,
  editable = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  editable?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h2>
        {editable && (
          <Button variant="ghost" size="md">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-44 flex-none text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");

  return (
    <div>
      <PageHeader
        title="Profil Saya"
        description="Kelola data akun, keamanan, dan preferensimu."
      />

      <div className="mt-6 space-y-4">
        {/* Basic Information */}
        <ProfileBlock icon={CircleUserRound} title="Informasi Dasar">
          <dl className="divide-y divide-border">
            <Row label="Nickname" value={user.name} />
            <Row
              label="Customer ID"
              value={
                <span className="num">
                  {customerIdFor(user.id)}{" "}
                  <span className="text-xs text-text-secondary">
                    (tidak bisa diubah)
                  </span>
                </span>
              }
            />
            <Row label="Negara/Wilayah" value="Indonesia" />
            <Row label="Nomor Telepon" value={<span className="num">{user.phone ?? "-"}</span>} />
            <Row label="Terdaftar" value={<span className="num">{formatDbDateTime(user.created_at)}</span>} />
          </dl>
        </ProfileBlock>

        {/* Identity Verification — optional for buyers, never required */}
        <ProfileBlock icon={BadgeCheck} title="Verifikasi Identitas">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={IDENTITY_VERIFIED ? "success" : "secondary"}>
              {IDENTITY_VERIFIED ? "Terverifikasi" : "Tidak diperlukan"}
            </Badge>
            <p className="text-xs text-text-secondary">
              Pembeli tidak perlu verifikasi identitas. Verifikasi hanya untuk
              pemilik toko, diperiksa manual oleh admin saat membuka toko.
            </p>
          </div>
        </ProfileBlock>

        {/* Account Security */}
        <ProfileBlock icon={KeyRound} title="Keamanan Akun">
          <dl className="divide-y divide-border">
            <Row label="Email" value={user.email} />
            <Row label="Password" value="••••••••••" />
          </dl>
        </ProfileBlock>

        {/* Notification Language */}
        <ProfileBlock icon={Globe} title="Bahasa Notifikasi">
          <p className="text-sm text-text">Bahasa Indonesia</p>
          <p className="mt-1 text-xs text-text-secondary">
            Dipakai untuk email dan notifikasi push.
          </p>
        </ProfileBlock>

        {/* Edit profile */}
        <ProfileBlock icon={CircleUserRound} title="Ubah Profil">
          <ApiForm
            endpoint="/api/auth/profile"
            method="PATCH"
            resetOnSuccess={false}
            fields={[
              { name: "name", label: "Nama", type: "text", required: true, defaultValue: user.name },
              { name: "phone", label: "Nomor HP", type: "text", defaultValue: user.phone ?? "", hint: "Contoh 081234567890, bisa dipakai untuk login." },
            ]}
          />
        </ProfileBlock>

        {/* Change password */}
        <ProfileBlock icon={KeyRound} title="Ganti Password">
          <ApiForm
            endpoint="/api/auth/change-password"
            submitLabel="Ganti password"
            successMessage="Password diganti."
            fields={[
              { name: "currentPassword", label: "Password saat ini", type: "password", required: true },
              { name: "newPassword", label: "Password baru (min. 8)", type: "password", required: true },
            ]}
          />
        </ProfileBlock>
      </div>
    </div>
  );
}
