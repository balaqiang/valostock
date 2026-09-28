import { redirect } from 'next/navigation';

export default async function CekTransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q;
  if (q) {
    redirect(`/topup/invoice?q=${encodeURIComponent(q)}`);
  }
  redirect('/topup/invoice');
}
