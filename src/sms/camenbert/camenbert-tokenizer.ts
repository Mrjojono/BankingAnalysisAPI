import { Logger } from '@nestjs/common';

const SPECIAL_TOKENS: Record<string, number> = {
  '[PAD]': 0,
  '[UNK]': 1,
  '[CLS]': 2,
  '[SEP]': 3,
  '[MASK]': 4,
};

export class CamenBertTokenizer {
  private readonly logger = new Logger(CamenBertTokenizer.name);
  private vocab: Map<string, number> | null = null;
  private idsToTokens: Map<number, string> | null = null;
  private maxLength: number;

  constructor(maxLength = 128) {
    this.maxLength = maxLength;
  }

  async load(vocabPath: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(vocabPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());

      this.vocab = new Map();
      this.idsToTokens = new Map();

      for (const [token, id] of Object.entries(SPECIAL_TOKENS)) {
        this.vocab.set(token, Number(id));
        this.idsToTokens.set(Number(id), token);
      }

      let idx = Object.keys(SPECIAL_TOKENS).length;
      for (const line of lines) {
        const token = line.trim();
        if (token && !this.vocab.has(token)) {
          this.vocab.set(token, idx);
          this.idsToTokens.set(idx, token);
          idx++;
        }
      }

      this.logger.log(`Tokenizer chargé: ${this.vocab.size} tokens`);
      return true;
    } catch (err) {
      this.logger.error(
        `Erreur chargement tokenizer: ${(err as Error).message}`,
      );
      return false;
    }
  }

  isLoaded(): boolean {
    return this.vocab !== null;
  }

  private basicTokenize(text: string): string[] {
    const cleaned = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const tokens: string[] = [];
    let current = '';
    for (const ch of cleaned) {
      if (/[a-z0-9]/.test(ch)) {
        current += ch;
      } else {
        if (current) tokens.push(current);
        current = '';
        if (ch.trim()) tokens.push(ch);
      }
    }
    if (current) tokens.push(current);
    return tokens;
  }

  private wordpieceTokenize(word: string): string[] {
    if (!this.vocab) return [word];
    if (this.vocab.has(word)) return [word];

    const tokens: string[] = [];
    let start = 0;
    const chars = [...word];

    while (start < chars.length) {
      let end = chars.length;
      let found = false;
      while (end > start) {
        const subword =
          start === 0
            ? chars.slice(start, end).join('')
            : '##' + chars.slice(start, end).join('');
        if (this.vocab.has(subword)) {
          tokens.push(subword);
          found = true;
          break;
        }
        end--;
      }
      if (!found) {
        tokens.push('[UNK]');
        break;
      }
      start = end;
    }
    return tokens;
  }

  encode(text: string): { inputIds: number[]; attentionMask: number[] } {
    if (!this.vocab) {
      return { inputIds: [], attentionMask: [] };
    }

    const basic = this.basicTokenize(text);
    const pieces: string[] = ['[CLS]'];
    for (const word of basic) {
      const wp = this.wordpieceTokenize(word);
      pieces.push(...wp);
    }
    pieces.push('[SEP]');

    const truncated = pieces.slice(0, this.maxLength);
    const inputIds = truncated.map(
      (t) => this.vocab!.get(t) ?? SPECIAL_TOKENS['[UNK]'],
    );
    const attentionMask = inputIds.map(() => 1);

    while (inputIds.length < this.maxLength) {
      inputIds.push(SPECIAL_TOKENS['[PAD]']);
      attentionMask.push(0);
    }

    return { inputIds, attentionMask };
  }
}
