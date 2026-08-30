import { z } from "zod";

export const participantImportSchema = z.array(
  z.object({
    registration_number: z
      .string()
      .min(1, "Registration number is required")
      .max(100, "Registration number too long"),
    full_name: z
      .string()
      .min(1, "Full name is required")
      .max(200, "Full name too long"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format")
      .max(320, "Email too long"),
  })
);

export const teamCreateSchema = z.object({
  team_number: z.number().int().positive("Team number must be positive"),
  team_name: z
    .string()
    .min(1, "Team name is required")
    .max(120, "Team name too long"),
});

export const teamMemberAddSchema = z.object({
  team_id: z.string().uuid("Invalid team ID"),
  participant_qr_token: z
    .string()
    .min(1, "QR token is required")
    .max(256, "QR token too long"),
});

export const attendanceRecordSchema = z.object({
  participant_qr_token: z
    .string()
    .min(1, "QR token is required")
    .max(256, "QR token too long"),
  checkpoint: z
    .number()
    .int()
    .refine((n) => [1, 2, 3].includes(n), "Checkpoint must be 1, 2, or 3"),
  device_id: z.string().min(1, "Device ID is required").max(200),
});

export const qrTokenSchema = z
  .string()
  .min(1, "QR token is required")
  .max(256, "QR token too long");

export const volunteerAuthorizeSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["ADMIN", "VOLUNTEER"]),
  is_active: z.boolean(),
});

export const syncOperationSchema = z.object({
  operation_id: z.string().uuid("Invalid operation ID"),
  device_id: z.string().min(1).max(200),
  operation_type: z.enum(["CREATE_TEAM", "ADD_TEAM_MEMBER", "RECORD_ATTENDANCE"]),
  payload: z.object({}).passthrough(),
  created_at: z.string(),
});

export const passDeliverySendSchema = z.object({
  participant_ids: z.array(z.string().uuid()).min(1),
});
