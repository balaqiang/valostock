import {
  BadgeCheck,
  Landmark,
  Repeat,
  ShieldCheck,
  Store as StoreIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MockStore } from "@/lib/mock/stores";
import { storeLevelLabel, storeTypeLabel } from "@/lib/labels";

/**
 * Store type + trust badges per docs/MONEY_RULES.md §13:
 * Owner/Reseller · Identity Verified · Verified/Platinum Store · Deposit Secured.
 * `accountChecked` adds the per-listing inspection badge.
 */
export function StoreBadges({
  store,
  accountChecked = false,
  className,
}: {
  store: MockStore;
  accountChecked?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      <Badge variant="outline">
        {store.type === "OWNER" ? <StoreIcon /> : <Repeat />}
        {storeTypeLabel[store.type]}
      </Badge>
      {store.identityVerified && (
        <Badge>
          <BadgeCheck />
          Identity Verified
        </Badge>
      )}
      {store.level !== "AUTHORIZED" && (
        <Badge variant={store.level === "PLATINUM" ? "default" : "secondary"}>
          <ShieldCheck />
          {storeLevelLabel[store.level]}
        </Badge>
      )}
      {store.depositSecured && (
        <Badge variant="secondary">
          <Landmark />
          Deposit Secured
        </Badge>
      )}
      {accountChecked && (
        <Badge variant="success">
          <BadgeCheck />
          Account Checked
        </Badge>
      )}
    </div>
  );
}
