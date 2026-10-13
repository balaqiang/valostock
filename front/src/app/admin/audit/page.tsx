import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Table, Td } from "@/components/dashboard/ui";
import { adminGet, type AuditEntry } from "@/lib/data/admin";
import { formatDbDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit Log | Admin" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["action", "actor", "targetType", "from", "to"]) if (sp[key]) params.set(key, sp[key]!);
  const data = await adminGet<{ entries: AuditEntry[] }>(`/audit?${params}`);
  if (!data) return <Denied permission="audit:view" />;
  const input = "h-9 rounded-lg border border-border bg-background px-3";

  return (
    <div className="space-y-6">
      <DashHeader title="Audit Log" description="Jejak setiap keputusan admin dan aksi sensitif (append-only): siapa, kapan, aksi, target, detail, dan IP." />
      <form className="flex flex-wrap gap-2 text-sm">
        <input name="action" defaultValue={sp.action ?? ""} placeholder="aksi, mis. catalog" className={input} />
        <input name="actor" defaultValue={sp.actor ?? ""} placeholder="admin (nama/email)" className={input} />
        <input name="targetType" defaultValue={sp.targetType ?? ""} placeholder="target, mis. store" className={input} />
        <input type="date" name="from" defaultValue={sp.from ?? ""} className={input} />
        <input type="date" name="to" defaultValue={sp.to ?? ""} className={input} />
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Filter</button>
      </form>
      <Table head={["Waktu", "Aksi", "Admin", "Target", "Detail", "IP"]} empty="Tidak ada entri.">
        {data.entries.map((e) => (
          <tr key={e.id}>
            <Td className="whitespace-nowrap text-xs text-text-secondary">{formatDbDateTime(e.date)}</Td>
            <Td className="text-xs font-medium">{e.action}</Td>
            <Td className="text-xs">{e.actor}</Td>
            <Td className="num text-xs">
              {e.targetType}
              <span className="block text-text-secondary">{e.targetId.slice(0, 13)}</span>
            </Td>
            <Td>
              {e.detail ? <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-text-secondary">{JSON.stringify(e.detail)}</pre> : "-"}
            </Td>
            <Td className="num text-xs text-text-secondary">{e.ip ?? "-"}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
