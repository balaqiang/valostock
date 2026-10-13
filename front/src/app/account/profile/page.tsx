import type { Metadata } from "next";
import { CircleUserRound, KeyRound } from "lucide-react";
import { ApiForm } from "@/components/dashboard/api-form";
import { PageHeader } from "@/components/account/bits";
import { requireUser } from "@/lib/auth";
import { customerIdFor, formatDbDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Profil Saya | valostock.id",
};

function ProfileBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
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

// Profil Saya (SKPL 4.3.10, SKPL-F-01.3): basic info, account security, edit profile, change password.
export default async function ProfilePage() {
  const user = await requireUser("/account/profile");

  return (
    <div>
      <PageHeader title="Profil Saya" description="Kelola data akun dan password kamu." />

      <div className="mt-6 space-y-4">
        <ProfileBlock icon={CircleUserRound} title="Informasi Dasar">
          <dl className="divide-y divide-border">
            <Row label="Nama" value={user.name} />
            <Row label="Customer ID" value={<span className="num">{customerIdFor(user.id)}</span>} />
            <Row label="Nomor HP" value={<span className="num">{user.phone ?? "-"}</span>} />
            <Row label="Kode referral" value={<span className="num font-semibold tracking-wider">{user.referralCode}</span>} />
            <Row label="Terdaftar" value={<span className="num">{formatDbDateTime(user.created_at)}</span>} />
          </dl>
        </ProfileBlock>

        <ProfileBlock icon={KeyRound} title="Keamanan Akun">
          <dl className="divide-y divide-border">
            <Row label="Email" value={user.email} />
            <Row label="Password" value="••••••••••" />
          </dl>
        </ProfileBlock>

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
