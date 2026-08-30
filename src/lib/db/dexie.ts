import Dexie, { Table } from "dexie";

export interface LocalParticipant {
  id: string;
  registration_number: string;
  full_name: string;
  email: string;
  qr_token_hash: string;
}

export interface LocalTeam {
  id: string;
  team_number: number;
  team_name: string;
  created_by: string;
}

export interface LocalTeamMember {
  team_id: string;
  participant_id: string;
  added_by: string;
}

export interface LocalAttendance {
  id: string;
  participant_id: string;
  checkpoint: 1 | 2 | 3;
  recorded_by: string;
  recorded_at: string;
  device_id: string;
  synced: boolean;
}

export interface SyncOperation {
  id?: string;
  operation_id: string;
  device_id: string;
  volunteer_id: string;
  operation_type: "CREATE_TEAM" | "ADD_TEAM_MEMBER" | "RECORD_ATTENDANCE";
  payload: Record<string, unknown>;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
  created_at: string;
  processed_at?: string;
  error?: string;
}

export interface DeviceMetadata {
  key: string;
  value: string;
}

class RegDeskDB extends Dexie {
  participants!: Table<LocalParticipant, string>;
  teams!: Table<LocalTeam, string>;
  teamMembers!: Table<LocalTeamMember, string[]>;
  attendance!: Table<LocalAttendance, string>;
  syncOperations!: Table<SyncOperation, string>;
  metadata!: Table<DeviceMetadata, string>;

  constructor() {
    super("RegDeskDB");
    
    this.version(1).stores({
      participants: "id, registration_number, qr_token_hash",
      teams: "id, team_number",
      teamMembers: "[team_id+participant_id], participant_id",
      attendance: "id, [participant_id+checkpoint]",
      syncOperations: "id, operation_id, status, created_at",
      metadata: "key",
    });
  }
}

export const db = new RegDeskDB();

export async function getDeviceId(): Promise<string> {
  const meta = await db.metadata.get("device_id");
  if (!meta) {
    const uuid = crypto.randomUUID();
    await db.metadata.put({ key: "device_id", value: uuid });
    return uuid;
  }
  return meta.value;
}

export async function updateSyncStatus(status: "READY" | "SYNCING" | "ERROR"): Promise<void> {
  await db.metadata.put({ key: "sync_status", value: status });
}

export async function getSyncStatus(): Promise<string> {
  const meta = await db.metadata.get("sync_status");
  return meta?.value || "NOT_READY";
}

export async function setBootstrapComplete(): Promise<void> {
  await db.metadata.put({ key: "bootstrap_complete", value: "true" });
}

export async function isBootstrapComplete(): Promise<boolean> {
  const meta = await db.metadata.get("bootstrap_complete");
  return meta?.value === "true";
}
