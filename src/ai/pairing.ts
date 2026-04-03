import { callClaude } from './client';
import { PAIRING_SYSTEM_PROMPT, PAIRING_USER_PROMPT } from './prompts';

interface PairingSuggestion {
  itemId: string;
  reason: string;
}

export async function pairResearchItems(
  apiKey: string,
  paragraphText: string,
  researchItems: Array<{ id: string; title: string; preview: string }>
): Promise<PairingSuggestion[]> {
  if (researchItems.length === 0) return [];

  const response = await callClaude(
    apiKey,
    PAIRING_SYSTEM_PROMPT,
    PAIRING_USER_PROMPT(paragraphText, researchItems),
    500
  );

  try {
    const parsed = JSON.parse(response);
    return parsed.suggestions || [];
  } catch {
    return [];
  }
}
