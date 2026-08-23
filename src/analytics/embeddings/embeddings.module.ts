import { Module, Global } from '@nestjs/common';
import { EmbeddingLoader } from './embedding-loader';
import { TextVectorizer } from './text-vectorizer';
import { EmbeddingClassifier } from './embedding-classifier';

@Global()
@Module({
  providers: [EmbeddingLoader, TextVectorizer, EmbeddingClassifier],
  exports: [EmbeddingLoader, TextVectorizer, EmbeddingClassifier],
})
export class EmbeddingsModule {}
