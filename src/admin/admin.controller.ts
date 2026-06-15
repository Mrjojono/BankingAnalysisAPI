import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Classifier } from '../analytics/shared/classifier';
import { EmbeddingLoader } from '../analytics/embeddings/embedding-loader';
import { EmbeddingClassifier } from '../analytics/embeddings/embedding-classifier';
import { TrainCommand } from '../analytics/training/train-command';
import { EXPENSE_KEYWORDS } from '../analytics/config/expense-keywords';
import type { ExpenseCategory } from '../analytics/config/expense-keywords';

@ApiTags('Admin')
//@ApiBearerAuth()
//@UseGuards(JwtAuthGuard)
@Controller('api/admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly classifier?: Classifier,
    @Optional() private readonly embeddingLoader?: EmbeddingLoader,
    @Optional() private readonly embeddingClassifier?: EmbeddingClassifier,
    @Optional() private readonly trainCommand?: TrainCommand,
  ) {}

  @Get('products')
  async listProducts() {
    return this.prisma.bankProduct.findMany({
      include: { rules: true },
      orderBy: { code: 'asc' },
    });
  }

  @Get('products/:id')
  async getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.bankProduct.findUnique({
      where: { id },
      include: { rules: true },
    });
  }

  @Post('products')
  async createProduct(@Body() body: any) {
    return this.prisma.bankProduct.create({ data: body });
  }

  @Put('products/:id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.bankProduct.update({ where: { id }, data: body });
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.bankProduct.delete({ where: { id } });
  }

  @Get('rules')
  async listRules() {
    return this.prisma.rule.findMany({
      include: { product: true },
      orderBy: { code: 'asc' },
    });
  }

  @Get('rules/:id')
  async getRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.rule.findUnique({
      where: { id },
      include: { product: true },
    });
  }

  @Post('rules')
  async createRule(@Body() body: any) {
    return this.prisma.rule.create({ data: body });
  }

  @Put('rules/:id')
  async updateRule(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.prisma.rule.update({ where: { id }, data: body });
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.rule.delete({ where: { id } });
  }

  @Get('catalog')
  async getCatalog() {
    const fs = await import('fs/promises');
    const path = await import('path');
    const raw = await fs.readFile(
      path.join(process.cwd(), 'src/messages/catalog.json'),
      'utf-8',
    );
    return JSON.parse(raw);
  }

  @Put('catalog')
  async updateCatalog(@Body() body: any) {
    const fs = await import('fs/promises');
    const path = await import('path');
    await fs.writeFile(
      path.join(process.cwd(), 'src/messages/catalog.json'),
      JSON.stringify(body, null, 2),
      'utf-8',
    );
    return { ok: true };
  }

  // ──────────── Nouveautés Analytics ────────────

  @Get('classifier/test')
  async testClassifier(@Query('desc') desc: string) {
    if (!desc) return { error: 'Paramètre desc requis' };
    if (!this.classifier) return { error: 'Classifieur non disponible' };
    return this.classifier.testAll(desc);
  }

  @Get('embedding/stats')
  async embeddingStats() {
    if (!this.embeddingLoader) return { error: 'Embeddings non disponible' };
    const loaded = this.embeddingLoader.isLoaded();
    const stats: Record<string, unknown> = {
      loaded,
      vocabSize: loaded ? this.embeddingLoader.vocabSize() : 0,
    };

    if (loaded && this.embeddingClassifier?.isReady()) {
      const wordsPerCategory: Record<string, number> = {};
      let totalKeywords = 0;
      for (const [cat, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
        let found = 0;
        for (const kw of keywords) {
          if (this.embeddingLoader!.getVector(kw.toLowerCase())) found++;
        }
        wordsPerCategory[cat] = found;
        totalKeywords += keywords.length;
      }
      stats.wordsPerCategory = wordsPerCategory;
      stats.totalKeywords = totalKeywords;
      stats.categories = Object.keys(wordsPerCategory).length;
    }

    return stats;
  }

  @Get('embedding/neighbors')
  async embeddingNeighbors(
    @Query('desc') desc: string,
    @Query('n') n?: string,
  ) {
    if (!desc) return { error: 'Paramètre desc requis' };
    if (!this.embeddingClassifier?.isReady())
      return { error: 'Embeddings non chargés' };
    const top = this.embeddingClassifier.topN(desc, Number(n) || 5);
    return { description: desc, neighbors: top };
  }

  @Get('training/examples')
  async trainingExamples() {
    const { loadTrainingData } =
      await import('../analytics/training/data-loader.js');
    const examples = loadTrainingData();
    return { count: examples.length, examples };
  }

  @Put('training/examples/:id')
  async updateTrainingExample(@Param('id') id: string, @Body() body: any) {
    const { updateTrainingExample } =
      await import('../analytics/training/data-loader.js');
    const updated = updateTrainingExample(id, body);
    if (!updated) return { error: 'Exemple introuvable' };
    return updated;
  }

  @Post('training/examples')
  async createTrainingExample(@Body() body: any) {
    const { appendTrainingExample } =
      await import('../analytics/training/data-loader.js');
    appendTrainingExample(body);
    return { ok: true, example: body };
  }

  @Delete('training/examples/:id')
  async deleteTrainingExample(@Param('id') id: string) {
    const { deleteTrainingExample } =
      await import('../analytics/training/data-loader.js');
    const deleted = deleteTrainingExample(id);
    if (!deleted) return { error: 'Exemple introuvable' };
    return { ok: true };
  }

  @Post('training/run')
  async runTraining(
    @Body()
    params: {
      epochs?: number;
      lr?: number;
      layers?: number;
      margin?: number;
    },
  ) {
    if (!this.trainCommand) return { error: 'Entraînement non disponible' };
    const result = await this.trainCommand.run({
      epochs: params.epochs,
      learningRate: params.lr,
      layers: (params.layers as 1 | 2) ?? 1,
      margin: params.margin,
    });
    return {
      config: result.config,
      finalAccuracy: result.finalAccuracy,
      metrics: result.metrics.slice(-5), // 5 dernières époques
    };
  }
}
