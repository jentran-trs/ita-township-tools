// Files to print for an event (v43): uploaded by the superadmin with a number
// of copies, downloaded and ticked "Printed" by whoever prints (Lydia).
// Stored in the private `event-print-files` bucket; downloads are signed
// links that expire after an hour.

export const PRINT_FILES_BUCKET = 'event-print-files';
export const MAX_PRINT_FILE_BYTES = 50 * 1024 * 1024;

export type PrintFile = {
  id: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  copies: number;
  // Paper size to print on (v50), e.g. "Letter (8.5 × 11 in)"; null = not set.
  paper_size: string | null;
  printed_at: string | null;
  printed_by: string | null;
  created_at: string;
  download_url: string | null;
};

/** The event's uploaded files, oldest first, each with a fresh download link. */
export async function listPrintFiles(supabase: any, courseId: string): Promise<PrintFile[]> {
  const { data } = await supabase
    .from('cert_print_files')
    .select('*')
    .eq('course_id', courseId)
    .eq('uploaded', true)
    .order('created_at', { ascending: true });
  const rows = data || [];
  return Promise.all(
    rows.map(async (r: any) => {
      const { data: signed } = await supabase.storage
        .from(PRINT_FILES_BUCKET)
        .createSignedUrl(r.storage_path, 60 * 60, { download: r.file_name });
      return {
        id: r.id,
        file_name: r.file_name,
        content_type: r.content_type,
        size_bytes: r.size_bytes != null ? Number(r.size_bytes) : null,
        copies: r.copies,
        paper_size: r.paper_size ?? null,
        printed_at: r.printed_at,
        printed_by: r.printed_by,
        created_at: r.created_at,
        download_url: signed?.signedUrl || null,
      };
    })
  );
}

/** Tick or untick "Printed" on one of the event's files. */
export async function setPrinted(supabase: any, courseId: string, id: string, printed: boolean, by: string) {
  return supabase
    .from('cert_print_files')
    .update(printed ? { printed_at: new Date().toISOString(), printed_by: by.slice(0, 80) } : { printed_at: null, printed_by: null })
    .eq('id', id)
    .eq('course_id', courseId);
}
