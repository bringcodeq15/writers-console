import { callClaude } from './client';
import { SCAFFOLD_SYSTEM_PROMPT, SCAFFOLD_USER_PROMPT } from './prompts';

export async function summarizeParagraph(
  apiKey: string,
  paragraphText: string
): Promise<string> {
  const response = await callClaude(
    apiKey,
    SCAFFOLD_SYSTEM_PROMPT,
    SCAFFOLD_USER_PROMPT(paragraphText),
    150
  );
  return response.trim();
}
