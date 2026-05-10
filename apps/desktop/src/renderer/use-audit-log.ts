import type { TermPetAuditRecord } from "@termpet/protocol";
import { startTransition, useEffect, useState } from "react";
import { fetchBridgeAudit } from "./bridge-client";

export function useAuditLog(enabled: boolean, refreshKey?: number, limit = 6) {
  const [records, setRecords] = useState<TermPetAuditRecord[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void fetchBridgeAudit(limit)
      .then((nextRecords) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setRecords(nextRecords);
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("桥接审计记录读取失败。", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, limit, refreshKey]);

  return records;
}
