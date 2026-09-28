import type { Metadata } from "next";
import {
  BadgeCheck,
  CircleUserRound,
  Globe,
  ImageUp,
  KeyRound,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { requireUser } from "@/lib/auth";
import { customerIdFor, formatDbDateTime } from "@/lib/format";

// Not stored yet: buyer KYC is optional and 2FA/OTP isn't implemented.
const KYC_VERIFIED = false;
const TWOFA_ENABLED = false;

export const metadata: Metadata = {
  title: "Profil Saya — valostock.id",
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
            <Row label="Nomor Telepon" value={<span className="num">{user.phone ?? "—"}</span>} />
            <Row label="Terdaftar" value={<span className="num">{formatDbDateTime(user.created_at)}</span>} />
          </dl>
        </ProfileBlock>

        {/* Identity Verification — optional for buyers, never required */}
        <ProfileBlock icon={BadgeCheck} title="Verifikasi Identitas (KYC)">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={KYC_VERIFIED ? "success" : "secondary"}>
              {KYC_VERIFIED ? "Terverifikasi" : "Belum diverifikasi"}
            </Badge>
            <p className="text-xs text-text-secondary">
              Opsional untuk pembeli — tidak pernah diwajibkan. KYC hanya wajib
              saat membuka toko.
            </p>
          </div>
        </ProfileBlock>

        {/* Account Security */}
        <ProfileBlock icon={KeyRound} title="Keamanan Akun">
          <dl className="divide-y divide-border">
            <Row label="Email" value={user.email} />
            <Row label="Password" value="••••••••••" />
            <Row
              label="Autentikasi 2 Langkah"
              value={
                <Badge variant={TWOFA_ENABLED ? "success" : "warning"}>
                  {TWOFA_ENABLED ? "Aktif" : "Nonaktif — aktifkan untuk keamanan ekstra"}
                </Badge>
              }
            />
          </dl>
        </ProfileBlock>

        {/* Notification Language */}
        <ProfileBlock icon={Globe} title="Bahasa Notifikasi">
          <p className="text-sm text-text">Bahasa Indonesia</p>
          <p className="mt-1 text-xs text-text-secondary">
            Dipakai untuk email dan notifikasi push.
          </p>
        </ProfileBlock>

        {/* Avatar */}
        <ProfileBlock icon={ImageUp} title="Avatar">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-primary/10 font-display text-lg font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <p className="text-xs text-text-secondary">
              PNG/JPG maks. 2MB. Avatar tampil di ulasan dan chat.
            </p>
          </div>
        </ProfileBlock>
      </div>
    </div>
  );
}
