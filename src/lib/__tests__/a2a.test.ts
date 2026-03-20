/**
 * @jest-environment node
 */

import { validateAgentUrl, parseAgentCardMetadata, extractA2AResponseText } from '../a2a';

describe('validateAgentUrl', () => {
  it('returns normalized URL for valid HTTPS URL', () => {
    expect(validateAgentUrl('https://example.com')).toBe('https://example.com');
  });

  it('returns normalized URL for valid HTTP URL', () => {
    expect(validateAgentUrl('http://example.com')).toBe('http://example.com');
  });

  it('returns null for invalid URL', () => {
    expect(validateAgentUrl('not-a-url')).toBeNull();
  });

  it('returns null for non-http protocol', () => {
    expect(validateAgentUrl('ftp://example.com')).toBeNull();
    expect(validateAgentUrl('file:///etc/passwd')).toBeNull();
  });

  it('removes trailing slashes', () => {
    expect(validateAgentUrl('https://example.com/')).toBe('https://example.com');
    expect(validateAgentUrl('https://example.com///')).toBe('https://example.com');
  });

  it('preserves URL with path', () => {
    expect(validateAgentUrl('https://example.com/agents/v1')).toBe(
      'https://example.com/agents/v1',
    );
  });

  it('returns null for empty string', () => {
    expect(validateAgentUrl('')).toBeNull();
    expect(validateAgentUrl('   ')).toBeNull();
  });
});

describe('parseAgentCardMetadata', () => {
  it('extracts metadata from card with metadata object', () => {
    const card = {
      name: 'Test Agent',
      metadata: {
        personality_type: 'Romantic',
        interests: ['cooking', 'wine'],
        deal_breakers: ['bad manners'],
        love_language: 'Acts of Service',
        catchphrase: 'Love is the secret ingredient',
        avatar_emoji: '🦞',
        name_cn: '测试',
      },
    };

    const result = parseAgentCardMetadata(card);
    expect(result.personalityType).toBe('Romantic');
    expect(result.interests).toEqual(['cooking', 'wine']);
    expect(result.dealBreakers).toEqual(['bad manners']);
    expect(result.loveLanguage).toBe('Acts of Service');
    expect(result.catchphrase).toBe('Love is the secret ingredient');
    expect(result.avatarEmoji).toBe('🦞');
    expect(result.nameCn).toBe('测试');
  });

  it('falls back to top-level fields when metadata is missing', () => {
    const card = {
      personality_type: 'Adventurous',
      interests: ['hiking'],
      catchphrase: 'Into the wild',
    };

    const result = parseAgentCardMetadata(card);
    expect(result.personalityType).toBe('Adventurous');
    expect(result.interests).toEqual(['hiking']);
    expect(result.catchphrase).toBe('Into the wild');
  });

  it('handles missing metadata gracefully', () => {
    const result = parseAgentCardMetadata({});
    expect(result.personalityType).toBe('');
    expect(result.interests).toEqual([]);
    expect(result.dealBreakers).toEqual([]);
    expect(result.loveLanguage).toBe('');
    expect(result.catchphrase).toBe('');
    expect(result.avatarEmoji).toBe('🦞');
    expect(result.nameCn).toBe('');
  });

  it('strips HTML from string values', () => {
    const card = {
      metadata: {
        personality_type: '<b>Bold</b> and <i>italic</i>',
        catchphrase: '<script>alert("xss")</script>Hello',
      },
    };

    const result = parseAgentCardMetadata(card);
    expect(result.personalityType).toBe('Bold and italic');
    expect(result.catchphrase).toBe('alert("xss")Hello');
  });

  it('limits string lengths', () => {
    const card = {
      metadata: {
        personality_type: 'A'.repeat(200),
        avatar_emoji: '🦞'.repeat(20),
      },
    };

    const result = parseAgentCardMetadata(card);
    expect(result.personalityType.length).toBeLessThanOrEqual(50);
    expect(result.avatarEmoji.length).toBeLessThanOrEqual(10);
  });

  it('parses comma-separated interests string', () => {
    const card = {
      metadata: {
        interests: 'cooking, travel, music',
      },
    };

    const result = parseAgentCardMetadata(card);
    expect(result.interests).toEqual(['cooking', 'travel', 'music']);
  });

  it('limits interests to 10 items', () => {
    const card = {
      metadata: {
        interests: Array.from({ length: 15 }, (_, i) => `interest${i}`),
      },
    };
    const result = parseAgentCardMetadata(card);
    expect(result.interests).toHaveLength(10);
  });

  it('filters out non-string interest entries', () => {
    const card = {
      metadata: {
        interests: ['cooking', 42, null, 'travel'],
      },
    };
    const result = parseAgentCardMetadata(card);
    expect(result.interests).toEqual(['cooking', 'travel']);
  });

  it('parses JSON array string for interests', () => {
    const card = {
      metadata: {
        interests: '["coding", "gaming"]',
      },
    };
    const result = parseAgentCardMetadata(card);
    expect(result.interests).toEqual(['coding', 'gaming']);
  });
});

describe('extractA2AResponseText', () => {
  it('extracts text from result.message.parts', () => {
    const result = extractA2AResponseText({
      result: {
        message: {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello from A2A!' }],
        },
      },
    });
    expect(result.text).toBe('Hello from A2A!');
    expect(result.sessionId).toBeNull();
  });

  it('extracts text from result.artifacts', () => {
    const result = extractA2AResponseText({
      result: {
        artifacts: [
          { parts: [{ text: 'Artifact text' }] },
        ],
      },
    });
    expect(result.text).toBe('Artifact text');
  });

  it('extracts text from result.text directly', () => {
    const result = extractA2AResponseText({
      result: { text: 'Direct text' },
    });
    expect(result.text).toBe('Direct text');
  });

  it('extracts sessionId from metadata', () => {
    const result = extractA2AResponseText({
      result: {
        message: { parts: [{ type: 'text', text: 'hi' }] },
        metadata: { sessionId: 'sess-123' },
      },
    });
    expect(result.sessionId).toBe('sess-123');
  });

  it('extracts sessionId from result root', () => {
    const result = extractA2AResponseText({
      result: {
        text: 'hi',
        sessionId: 'sess-456',
      },
    });
    expect(result.sessionId).toBe('sess-456');
  });

  it('throws on missing result field', () => {
    expect(() => extractA2AResponseText({})).toThrow('空结果');
  });

  it('throws on null result', () => {
    expect(() => extractA2AResponseText({ result: null })).toThrow('空结果');
  });

  it('throws on array result (non-object)', () => {
    expect(() => extractA2AResponseText({ result: [1, 2, 3] })).toThrow('非法结果格式');
  });

  it('throws on empty message (no text extractable)', () => {
    expect(() =>
      extractA2AResponseText({
        result: { message: { parts: [] } },
      }),
    ).toThrow('空消息');
  });

  it('throws on parts with no text fields', () => {
    expect(() =>
      extractA2AResponseText({
        result: {
          message: {
            parts: [{ type: 'image', url: 'http://example.com/img.png' }],
          },
        },
      }),
    ).toThrow('空消息');
  });

  it('concatenates multiple text parts', () => {
    const result = extractA2AResponseText({
      result: {
        message: {
          parts: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'World' },
          ],
        },
      },
    });
    expect(result.text).toBe('Hello World');
  });

  it('ignores non-text parts while extracting text', () => {
    const result = extractA2AResponseText({
      result: {
        message: {
          parts: [
            { type: 'text', text: 'Valid' },
            { type: 'image', url: 'img.png' },
            { type: 'text', text: ' text' },
          ],
        },
      },
    });
    expect(result.text).toBe('Valid text');
  });
});
