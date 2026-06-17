import { createAdminClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "branding";

/**
 * Upload a company logo to Supabase Storage (public "branding" bucket, created
 * on first use) and return its public URL. Uses the service-role admin client.
 */
export async function uploadCompanyLogo(companyId: string, file: File): Promise<string> {
  const admin = createAdminClient();
  await ensureBucket(admin);

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${companyId}/logo-${Date.now()}.${ext || "png"}`;
  const bytes = await file.arrayBuffer();

  const { error } = await admin.storage.from(LOGO_BUCKET).upload(path, bytes, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (error) throw new Error(error.message);

  return admin.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function ensureBucket(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const { data } = await admin.storage.getBucket(LOGO_BUCKET);
  if (!data) {
    await admin.storage.createBucket(LOGO_BUCKET, { public: true });
  }
}
