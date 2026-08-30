"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { db, getDeviceId, updateSyncStatus, setBootstrapComplete, isBootstrapComplete } from "@/lib/db/dexie";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type SyncStatus = "NOT_READY" | "READY" | "BOOTSTRAPPING" | "SYNCING" | "SYNCED" | "ERROR" | "OFFLINE";

interface UseOfflineSyncReturn {
  status: SyncStatus;
  deviceId: string | null;
  pendingCount: number;
  bootstrap: () => Promise<void>;
  syncPendingOperations: () => Promise<void>;
  addOperation: (op: Omit<import("@/lib/db/dexie").SyncOperation, "id">) => Promise<string>;
  isOnline: boolean;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [status, setStatus] = useState<SyncStatus>("NOT_READY");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const syncPendingOperationsRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Initialize device ID and check online status
  useEffect(() => {
    const init = async () => {
      const id = await getDeviceId();
      setDeviceId(id);
      setIsOnline(navigator.onLine);

      const alreadyBootstrapped = await isBootstrapComplete();
      if (alreadyBootstrapped) {
        setStatus("READY");
      }
    };
    init();

    const handleOnline = () => {
      setIsOnline(true);
      if (status === "OFFLINE") {
        setStatus("SYNCING");
        syncPendingOperationsRef.current().catch(console.error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("OFFLINE");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [status]);

  // Count pending operations
  useEffect(() => {
    const countPending = async () => {
      const count = await db.syncOperations.where("status").equals("PENDING").count();
      setPendingCount(count);
    };
    countPending();
  }, [status]);

  const bootstrap = useCallback(async () => {
    if (!deviceId) return;

    setStatus("BOOTSTRAPPING");
    updateSyncStatus("SYNCING");

    try {
      const supabase = createSupabaseBrowserClient();

      // Fetch participants (without email for security)
      const { data: participants, error: pError } = await supabase
        .from("participants")
        .select("id, registration_number, full_name, qr_token_hash");

      if (pError) throw pError;

      // Clear and repopulate local participants
      await db.participants.clear();
      await db.participants.bulkPut(participants || []);

      // Fetch teams
      const { data: teams, error: tError } = await supabase
        .from("teams")
        .select("*");

      if (tError) throw tError;

      await db.teams.clear();
      await db.teams.bulkPut(teams || []);

      // Fetch team members
      const { data: teamMembers, error: tmError } = await supabase
        .from("team_members")
        .select("team_id, participant_id, added_by");

      if (tmError) throw tmError;

      await db.teamMembers.clear();
      await db.teamMembers.bulkPut(teamMembers || []);

      // Fetch attendance records
      const { data: attendance, error: aError } = await supabase
        .from("attendance")
        .select("id, participant_id, checkpoint, recorded_by, recorded_at, device_id");

      if (aError) throw aError;

      // Convert to local format with synced flag
      const localAttendance = (attendance || []).map(a => ({
        ...a,
        synced: true,
      }));

      await db.attendance.clear();
      await db.attendance.bulkPut(localAttendance);

      await setBootstrapComplete();
      setStatus("READY");
      updateSyncStatus("READY");
    } catch (error) {
      console.error("Bootstrap failed:", error);
      setStatus("ERROR");
      updateSyncStatus("ERROR");
      throw error;
    }
  }, [deviceId]);

  const syncPendingOperations = useCallback(async () => {
    if (!deviceId || !isOnline) return;

    setStatus("SYNCING");
    updateSyncStatus("SYNCING");

    try {
      const pendingOps = await db.syncOperations
        .where("status")
        .anyOf("PENDING", "FAILED")
        .toArray();

      if (pendingOps.length === 0) {
        setStatus("READY");
        updateSyncStatus("READY");
        return;
      }

      // Mark as syncing
      for (const op of pendingOps) {
        await db.syncOperations.update(op.id!, { status: "SYNCING" });
      }

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: pendingOps.map(({ id, ...rest }) => rest),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Sync failed");
      }

      // Update local status based on results
      for (const r of result.results) {
        const localOp = pendingOps.find(o => o.operation_id === r.operation_id);
        if (localOp) {
          await db.syncOperations.update(localOp.id!, {
            status: r.status === "ALREADY_PROCESSED" ? "SYNCED" : r.status,
            processed_at: new Date().toISOString(),
            error: r.error,
          });
        }
      }

      setStatus("READY");
      updateSyncStatus("READY");
    } catch (error) {
      console.error("Sync failed:", error);
      setStatus(isOnline ? "ERROR" : "OFFLINE");
      updateSyncStatus("ERROR");

      // Revert syncing ops back to pending
      await db.syncOperations
        .where("status")
        .equals("SYNCING")
        .modify({ status: "PENDING" });

      throw error;
    }
  }, [deviceId, isOnline]);

  // Store syncPendingOperations in ref for use in handleOnline
  useEffect(() => {
    syncPendingOperationsRef.current = syncPendingOperations;
  }, [syncPendingOperations]);

  const addOperation = useCallback(async (op: Omit<import("@/lib/db/dexie").SyncOperation, "id">) => {
    if (!deviceId) throw new Error("Device not initialized");

    const operation: import("@/lib/db/dexie").SyncOperation = {
      ...op,
      device_id: deviceId,
      created_at: new Date().toISOString(),
    };

    const id = await db.syncOperations.add(operation);
    setPendingCount(prev => prev + 1);

    // If online, try to sync immediately
    if (isOnline) {
      syncPendingOperations().catch(console.error);
    }

    return id;
  }, [deviceId, isOnline, syncPendingOperations]);

  return {
    status,
    deviceId,
    pendingCount,
    bootstrap,
    syncPendingOperations,
    addOperation,
    isOnline,
  };
}
