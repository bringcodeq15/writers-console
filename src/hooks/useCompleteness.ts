import { useMemo } from 'react';
import type { JSONContent } from '@tiptap/react';
import type { OutlineItem, ResearchItem, ResearchSuggestion } from '../db';

export interface CompletenessBreakdown {
  overall: number;
  structure: number;
  paragraphDepth: number;
  researchUtilization: number;
  outlineCoverage: number;
  wordCountProgress: number;
}

function extractNodes(content: JSONContent): { type: string; text: string; level?: number }[] {
  const nodes: { type: string; text: string; level?: number }[] = [];
  if (!content?.content) return nodes;

  for (const node of content.content) {
    if (!node.content || node.content.length === 0) continue;
    const text = node.content.map((c: JSONContent) => c.text || '').join('');
    if (text.trim()) {
      nodes.push({
        type: node.type || 'paragraph',
        text: text.trim(),
        level: node.attrs?.level,
      });
    }
  }
  return nodes;
}

function countWordsInText(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function scoreStructure(nodes: { type: string; text: string; level?: number }[]): number {
  let score = 0;
  const hasH1 = nodes.some((n) => n.type === 'heading' && n.level === 1);
  const h2Count = nodes.filter((n) => n.type === 'heading' && n.level === 2).length;
  const paragraphs = nodes.filter((n) => n.type === 'paragraph');

  if (hasH1) score += 30;
  if (h2Count >= 2) score += 25;
  else if (h2Count === 1) score += 12;

  // Intro: first non-heading paragraph has 20+ words
  if (paragraphs.length > 0 && countWordsInText(paragraphs[0].text) >= 20) {
    score += 20;
  }

  // Conclusion: last non-heading paragraph has 20+ words
  if (paragraphs.length > 1 && countWordsInText(paragraphs[paragraphs.length - 1].text) >= 20) {
    score += 15;
  }

  // Body: 3+ paragraphs between intro and conclusion
  if (paragraphs.length >= 5) score += 10;
  else if (paragraphs.length >= 3) score += 5;

  return Math.min(100, score);
}

function scoreParagraphDepth(nodes: { type: string; text: string }[]): number {
  const paragraphs = nodes.filter((n) => n.type === 'paragraph');
  const substantive = paragraphs.filter((p) => countWordsInText(p.text) >= 15);
  if (substantive.length === 0) return 0;

  const avgWords = substantive.reduce((sum, p) => sum + countWordsInText(p.text), 0) / substantive.length;
  return Math.min(100, Math.round((avgWords / 80) * 100));
}

function scoreResearchUtilization(
  researchItems: ResearchItem[],
  suggestions: ResearchSuggestion[]
): number {
  if (researchItems.length === 0) return 100;
  const pairedIds = new Set(suggestions.map((s) => s.researchItemId));
  return Math.round((pairedIds.size / researchItems.length) * 100);
}

function scoreOutlineCoverage(
  outlineItems: OutlineItem[],
  nodes: { type: string; text: string }[]
): number {
  if (outlineItems.length === 0) return 100;

  const allText = nodes.map((n) => n.text.toLowerCase()).join(' ');
  let covered = 0;

  for (const item of outlineItems) {
    const words = item.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    // Check if at least half the significant words appear in the document
    const matchCount = words.filter((w) => allText.includes(w)).length;
    if (words.length === 0 || matchCount / words.length >= 0.5) {
      covered++;
    }
  }

  return Math.round((covered / outlineItems.length) * 100);
}

function scoreWordCount(totalWords: number, target = 3000): number {
  const min = Math.max(500, target * 0.5);
  const max = target;

  if (totalWords >= min && totalWords <= max * 1.5) return 100;
  if (totalWords < min) return Math.round((totalWords / min) * 100);
  return Math.max(80, Math.round(100 - (totalWords - max * 1.5) / 100));
}

export function useCompleteness(
  content: JSONContent | undefined,
  outlineItems: OutlineItem[],
  researchItems: ResearchItem[],
  suggestions: ResearchSuggestion[]
): CompletenessBreakdown {
  return useMemo(() => {
    if (!content) {
      return { overall: 0, structure: 0, paragraphDepth: 0, researchUtilization: 100, outlineCoverage: 100, wordCountProgress: 0 };
    }

    const nodes = extractNodes(content);
    const totalWords = nodes.reduce((sum, n) => sum + countWordsInText(n.text), 0);

    const structure = scoreStructure(nodes);
    const paragraphDepth = scoreParagraphDepth(nodes);
    const researchUtilization = scoreResearchUtilization(researchItems, suggestions);
    const outlineCoverage = scoreOutlineCoverage(outlineItems, nodes);
    const wordCountProgress = scoreWordCount(totalWords);

    const overall = Math.round(
      structure * 0.2 +
      paragraphDepth * 0.2 +
      researchUtilization * 0.2 +
      outlineCoverage * 0.2 +
      wordCountProgress * 0.2
    );

    return { overall, structure, paragraphDepth, researchUtilization, outlineCoverage, wordCountProgress };
  }, [content, outlineItems, researchItems, suggestions]);
}
