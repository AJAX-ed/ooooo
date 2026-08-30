import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/volunteer";
import { participantImportSchema } from "@/lib/zod/schemas";
import { generateSecureQrToken, hashQrToken } from "@/lib/qr/tokens";

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const content = await file.text();
    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "File must have header and at least one data row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    
    const requiredHeaders = ["registration_number", "full_name", "email"];
    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        return NextResponse.json(
          { error: `Missing required column: ${header}` },
          { status: 400 }
        );
      }
    }

    const regIdx = headers.indexOf("registration_number");
    const nameIdx = headers.indexOf("full_name");
    const emailIdx = headers.indexOf("email");

    const participants = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      
      if (values.length < headers.length) {
        errors.push(`Row ${i + 1}: insufficient columns`);
        continue;
      }

      const registration_number = values[regIdx];
      const full_name = values[nameIdx];
      const email = values[emailIdx];

      try {
        const validated = participantImportSchema.parse([{ registration_number, full_name, email }]);
        participants.push(validated[0]);
      } catch (e) {
        if (e instanceof Error) {
          errors.push(`Row ${i + 1}: ${e.message}`);
        }
      }
    }

    if (participants.length === 0) {
      return NextResponse.json(
        { error: "No valid participants found", details: errors },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const imported = [];
    const duplicates: string[] = [];

    for (const p of participants) {
      const qrToken = generateSecureQrToken();
      const qrTokenHash = hashQrToken(qrToken);

      const { data, error } = await supabase
        .from("participants")
        .insert({
          registration_number: p.registration_number,
          full_name: p.full_name,
          email: p.email,
          qr_token_hash: qrTokenHash,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          duplicates.push(p.registration_number);
        } else {
          errors.push(`Failed to import ${p.registration_number}: ${error.message}`);
        }
      } else {
        imported.push({ ...data, qr_token: qrToken });
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.map(({ qr_token, ...rest }) => rest),
      tokens: Object.fromEntries(imported.map((p) => [p.id, p.qr_token])),
      duplicates,
      errors,
      summary: {
        total: participants.length,
        imported: imported.length,
        duplicates: duplicates.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Import failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
