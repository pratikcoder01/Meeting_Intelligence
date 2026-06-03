import { prisma } from '@/services/database.service';

export interface Citation {
  lineId?: string;
  text: string;
  timestamp: string;
}

/**
 * Validate citations against the database records.
 * Returns true if valid, returns false if invalid or invented.
 */
export async function validateCitations(
  citations: Citation[] | undefined,
  meetingId: string,
): Promise<boolean> {
  // If citations are missing or empty, fail validation
  if (!citations || citations.length === 0) {
    return false;
  }

  for (const cite of citations) {
    if (!cite.lineId) {
      return false;
    }

    // Fetch actual transcript line from DB
    const line = await prisma.transcriptLine.findUnique({
      where: { id: cite.lineId },
    });

    // If line doesn't exist, or doesn't belong to this meeting
    if (!line || line.meetingId !== meetingId) {
      return false;
    }

    // Text mismatch check
    if (line.text.trim() !== cite.text.trim()) {
      return false;
    }

    // Check if timestamp matches
    try {
      const dbTime = new Date(line.timestamp).toISOString();
      const citeTime = new Date(cite.timestamp).toISOString();
      if (dbTime !== citeTime) {
        return false; // Invented timestamp rejected
      }
    } catch {
      return false; // Invalid date strings rejected
    }
  }

  return true;
}
