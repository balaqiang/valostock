import Image from "next/image";

// Files in /public/images/agents — order defines which "first N" are owned.
export const AGENTS = [
  "Astra",
  "Breach",
  "Brimstone",
  "Chamber",
  "Clove",
  "Cypher",
  "Deadlock",
  "Fade",
  "Gekko",
  "Harbor",
  "Iso",
  "Jett",
  "KAYO",
  "Killjoy",
  "Miks",
  "Neon",
  "Omen",
  "Phoenix",
  "Raze",
  "Reyna",
  "Sage",
  "Skye",
  "Sova",
  "Tejo",
  "Veto",
  "Viper",
  "Vyse",
  "Waylay",
  "Yoru",
] as const;

function displayName(agent: string): string {
  return agent === "KAYO" ? "KAY/O" : agent;
}

export function AgentsGrid({ owned }: { owned: number }) {
  return (
    <div>
      <p className="text-sm text-text-secondary">
        Agent dimiliki:{" "}
        <span className="num font-semibold text-text">
          {owned}/{AGENTS.length}
        </span>
      </p>
      <ul className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-8">
        {AGENTS.map((agent, index) => {
          const isOwned = index < owned;
          return (
            <li key={agent} className="text-center">
              <div
                className={`relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-elevated ${
                  isOwned ? "" : "opacity-35 grayscale"
                }`}
              >
                <Image
                  src={`/images/agents/${agent}_icon.png`}
                  alt={displayName(agent)}
                  fill
                  sizes="90px"
                  className="object-cover"
                />
              </div>
              <p
                className={`mt-1 truncate text-[10px] font-medium ${
                  isOwned ? "text-text" : "text-text-secondary"
                }`}
              >
                {displayName(agent)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
