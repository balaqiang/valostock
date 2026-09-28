// The API the test scripts talk to. The tests pay through the simulator, so they
// need an API in PAYMENT_MODE=simulation: API_URL if set, else :4000 when it is
// in simulation mode, else the `npm run dev:sim` instance on :4100.
export async function resolveApi(): Promise<string> {
  if (process.env.API_URL) return process.env.API_URL;
  for (const url of ['http://localhost:4000/api', 'http://localhost:4100/api']) {
    try {
      const health = (await (await fetch(`${url}/health`)).json()) as { paymentMode?: string };
      if (health.paymentMode === 'simulation') return url;
    } catch {
      // not running — try the next one
    }
  }
  throw new Error('Tidak ada API dalam mode simulasi. Jalankan `npm run dev:sim` (port 4100) atau set PAYMENT_MODE=simulation.');
}
