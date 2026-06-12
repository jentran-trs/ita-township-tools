// Short, URL-friendly public codes for Live Q&A sessions. Mirrors the 8-char
// generateShareId() in app/api/projects/route.js (no new dependency).
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateCode(length = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

// Generate a code not already present, checked via the provided async fn.
// Falls back to a longer code after a few collisions (vanishingly unlikely).
export async function generateUniqueCode(
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateCode(attempt < 6 ? 8 : 10);
    if (!(await exists(candidate))) return candidate;
  }
  return generateCode(12);
}
