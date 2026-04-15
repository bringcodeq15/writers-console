import { callClaude } from './client';
import { FLOW_ANALYZER_SYSTEM_PROMPT, FLOW_ANALYZER_USER_PROMPT } from './prompts';

export interface FlowIssue {
  type: 'flow' | 'missing' | 'reorder' | 'redundancy';
  affectedParagraphs: number[];
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface FlowAnalysis {
  overall: string;
  issues: FlowIssue[];
}

export async function analyzeFlow(
  apiKey: string,
  summaries: Array<{ index: number; summary: string; isHeading: boolean }>
): Promise<FlowAnalysis> {
  if (summaries.length < 2) {
    return { overall: 'Not enough paragraphs to analyze.', issues: [] };
  }

  const response = await callClaude(
    apiKey,
    FLOW_ANALYZER_SYSTEM_PROMPT,
    FLOW_ANALYZER_USER_PROMPT(summaries),
    1500
  );

  try {
    // Strip any markdown code fences
    const cleaned = response.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      overall: parsed.overall || 'Analysis complete.',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return { overall: 'Could not parse analysis. Try again.', issues: [] };
  }
}
