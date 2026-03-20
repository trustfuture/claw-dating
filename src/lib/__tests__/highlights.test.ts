import { extractHighlights, parseHighlightsResponse } from '../highlights';

// Mock dependencies
jest.mock('@/lib/llm', () => ({
  isLLMConfigured: jest.fn().mockReturnValue(true),
  chatCompletion: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    dateSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chatCompletion, isLLMConfigured } = require('@/lib/llm');

describe('parseHighlightsResponse', () => {
  it('parses valid JSON array', () => {
    const input = JSON.stringify([
      { quote: 'Hello there!', speaker: 'Alice', category: 'funny' },
      { quote: 'Nice to meet you', speaker: 'Bob', category: 'sweet' },
    ]);
    const result = parseHighlightsResponse(input);
    expect(result).toHaveLength(2);
    expect(result![0].quote).toBe('Hello there!');
    expect(result![0].category).toBe('funny');
  });

  it('handles markdown-wrapped JSON', () => {
    const input = '```json\n[{"quote":"Test","speaker":"A","category":"witty"}]\n```';
    const result = parseHighlightsResponse(input);
    expect(result).toHaveLength(1);
    expect(result![0].quote).toBe('Test');
  });

  it('returns null for empty array', () => {
    expect(parseHighlightsResponse('[]')).toBeNull();
  });

  it('returns null for non-array JSON', () => {
    expect(parseHighlightsResponse('{"foo": "bar"}')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseHighlightsResponse('not json')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseHighlightsResponse('')).toBeNull();
  });

  it('filters out entries without quote or speaker', () => {
    const input = JSON.stringify([
      { quote: 'Valid', speaker: 'Alice', category: 'funny' },
      { quote: 'No speaker' },
      { speaker: 'No quote' },
      { notAQuote: true },
    ]);
    const result = parseHighlightsResponse(input);
    expect(result).toHaveLength(1);
    expect(result![0].quote).toBe('Valid');
  });

  it('defaults invalid category to witty', () => {
    const input = JSON.stringify([
      { quote: 'Test', speaker: 'A', category: 'invalid_cat' },
    ]);
    const result = parseHighlightsResponse(input);
    expect(result![0].category).toBe('witty');
  });

  it('limits to 3 highlights', () => {
    const input = JSON.stringify(
      Array.from({ length: 10 }, (_, i) => ({
        quote: `Quote ${i}`,
        speaker: 'A',
        category: 'funny',
      })),
    );
    const result = parseHighlightsResponse(input);
    expect(result).toHaveLength(3);
  });

  it('truncates long quotes', () => {
    const input = JSON.stringify([
      { quote: 'A'.repeat(300), speaker: 'Alice', category: 'funny' },
    ]);
    const result = parseHighlightsResponse(input);
    expect(result![0].quote.length).toBeLessThanOrEqual(200);
  });
});

describe('extractHighlights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isLLMConfigured.mockReturnValue(true);
  });

  it('returns null for fewer than 4 messages', async () => {
    const messages = [
      { senderName: 'A', content: 'Hi' },
      { senderName: 'B', content: 'Hello' },
    ];
    const result = await extractHighlights(messages);
    expect(result).toBeNull();
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it('returns null when LLM is not configured', async () => {
    isLLMConfigured.mockReturnValue(false);
    const messages = Array.from({ length: 5 }, (_, i) => ({
      senderName: i % 2 === 0 ? 'Alice' : 'Bob',
      content: `Message ${i}`,
    }));
    const result = await extractHighlights(messages);
    expect(result).toBeNull();
  });

  it('calls LLM and parses response', async () => {
    chatCompletion.mockResolvedValue(
      JSON.stringify([
        { quote: 'Extracted quote', speaker: 'Alice', category: 'romantic' },
      ]),
    );

    const messages = Array.from({ length: 6 }, (_, i) => ({
      senderName: i % 2 === 0 ? 'Alice' : 'Bob',
      content: `This is message number ${i} with enough content`,
    }));

    const result = await extractHighlights(messages);
    expect(result).toHaveLength(1);
    expect(result![0].quote).toBe('Extracted quote');
    expect(chatCompletion).toHaveBeenCalledTimes(1);
  });

  it('returns null when LLM fails', async () => {
    chatCompletion.mockRejectedValue(new Error('API error'));

    const messages = Array.from({ length: 5 }, (_, i) => ({
      senderName: i % 2 === 0 ? 'Alice' : 'Bob',
      content: `Message ${i}`,
    }));

    const result = await extractHighlights(messages);
    expect(result).toBeNull();
  });

  it('returns null when LLM returns garbage', async () => {
    chatCompletion.mockResolvedValue('This is not JSON at all');

    const messages = Array.from({ length: 5 }, (_, i) => ({
      senderName: i % 2 === 0 ? 'Alice' : 'Bob',
      content: `Message ${i}`,
    }));

    const result = await extractHighlights(messages);
    expect(result).toBeNull();
  });
});
