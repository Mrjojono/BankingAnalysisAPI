import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Req,
  Sse,
  Res,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Classifier } from '../analytics/shared/classifier';
import { EmbeddingLoader } from '../analytics/embeddings/embedding-loader';
import { EmbeddingClassifier } from '../analytics/embeddings/embedding-classifier';
import { TrainCommand } from '../analytics/training/train-command';
import { EXPENSE_KEYWORDS } from '../analytics/config/expense-keywords';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { SmsService } from '../sms/sms.service';
import { CamenBertService } from '../sms/camenbert/camenbert.service';
import { CamenBertTrainingService } from '../sms/camenbert/camenbert-training.service';
import { ModelRegistryService } from '../sms/models/model-registry.service';
import { EncryptionService } from '../encryption/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { BroadcastDto } from '../notifications/dto/broadcast.dto';
import {
  CreateScheduledNotificationDto,
  UpdateScheduledNotificationDto,
  PurgeNotificationsDto,
} from '../notifications/dto/scheduled-notification.dto';
import { Role, UserAccountStatus } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { MailService } from '../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import * as bcrypt from 'bcryptjs';
import { CamenBertTestDto } from './dto/camenbert-test.dto';
import { SmsDebugDto } from './dto/sms-debug.dto';
import { UpdateSmsPipelineDto } from './dto/sms-pipeline.dto';
import { SmsPipelineConfig } from '../sms/pipeline/config';
import { Response } from 'express';
import { map } from 'rxjs/operators';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
    private readonly auditService: AuditService,
    private readonly eligibilityService: EligibilityService,
    private readonly camenBert: CamenBertService,
    private readonly modelRegistry: ModelRegistryService,
    private readonly camenBertTraining: CamenBertTrainingService,
    private readonly classifier: Classifier,
    private readonly embeddingLoader: EmbeddingLoader,
    private readonly embeddingClassifier: EmbeddingClassifier,
    private readonly trainCommand: TrainCommand,
    private readonly mailService: MailService,
    private readonly encryption: EncryptionService,
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
  async createProduct(@Body() dto: CreateProductDto) {
    return this.prisma.bankProduct.create({ data: dto as any });
  }

  @Put('products/:id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.prisma.bankProduct.update({ where: { id }, data: dto as any });
  }

  @Put('products/:id/rules')
  async updateProductRules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { ruleIds: string[] },
  ) {
    const [cleared, updated] = await this.prisma.$transaction([
      this.prisma.rule.updateMany({
        where: { productId: id },
        data: { productId: null },
      }),
      this.prisma.rule.updateMany({
        where: { id: { in: body.ruleIds } },
        data: { productId: id },
      }),
    ]);
    return { cleared: cleared.count, updated: updated.count };
  }

  @Patch('products/:id/status')
  @ApiOperation({ summary: 'Activer/désactiver un produit' })
  async toggleProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
  ) {
    if (typeof body.isActive !== 'boolean') {
      throw new ConflictException('Le champ isActive doit être un booléen');
    }
    return this.prisma.bankProduct.update({
      where: { id },
      data: { isActive: body.isActive },
    });
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
  async createRule(@Body() dto: CreateRuleDto) {
    return this.prisma.rule.create({ data: dto as any });
  }

  @Put('rules/:id')
  async updateRule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRuleDto) {
    return this.prisma.rule.update({ where: { id }, data: dto as any });
  }

  @Patch('rules/:id/status')
  @ApiOperation({ summary: 'Activer/désactiver une règle' })
  async toggleRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
  ) {
    if (typeof body.isActive !== 'boolean') {
      throw new ConflictException('Le champ isActive doit être un booléen');
    }
    return this.prisma.rule.update({
      where: { id },
      data: { isActive: body.isActive },
    });
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

  @Get('catalog-fragments')
  async getCatalogFragments() {
    const fs = await import('fs/promises');
    const path = await import('path');
    const raw = await fs.readFile(
      path.join(process.cwd(), 'src/messages/catalog-fragments.json'),
      'utf-8',
    );
    return JSON.parse(raw);
  }

  @Put('catalog-fragments')
  async updateCatalogFragments(@Body() body: any) {
    const fs = await import('fs/promises');
    const path = await import('path');
    await fs.writeFile(
      path.join(process.cwd(), 'src/messages/catalog-fragments.json'),
      JSON.stringify(body, null, 2),
      'utf-8',
    );
    return { ok: true };
  }

  @Post('nlg/preview')
  async previewNlg(@Body() body: { kind: string; severity: string; vars?: Record<string, any> }) {
    const { NLGEngineService } = await import('../messages/nlg-engine.service.js');
    const { DocumentPlanner } = await import('../messages/document-planner.js');
    const { FragmentSelector } = await import('../messages/fragment-selector.js');
    const { EmbeddingLoader } = await import('../analytics/embeddings/embedding-loader.js');
    const { TextVectorizer } = await import('../analytics/embeddings/text-vectorizer.js');

    const loader = new EmbeddingLoader();
    const vectorizer = new TextVectorizer(loader);
    const selector = new FragmentSelector(loader, vectorizer);
    const planner = new DocumentPlanner(selector);
    const engine = new NLGEngineService(planner);

    const intent: any = {
      kind: body.kind,
      severity: body.severity ?? 'INFO',
      vars: (body.vars ?? {}) as Record<string, string | number>,
    };

    const result = engine.generateFromIntent(intent);
    return result;
  }

  @Get('nlg/intents')
  async getNlgIntents() {
    const fs = await import('fs/promises');
    const path = await import('path');
    const raw = await fs.readFile(
      path.join(process.cwd(), 'src/messages/catalog-fragments.json'),
      'utf-8',
    );
    const data = JSON.parse(raw);
    return Object.keys(data.compositions ?? {});
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
      file: 'keyword_embeddings.json',
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

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('sms/debug')
  @ApiOperation({
    summary: 'Diagnostiquer le filtrage SMS (parseSms + CamenBert + classifier)',
  })
  async debugSmsFilter(@Body() dto: SmsDebugDto) {
    return this.smsService.debugFilter(dto.address, dto.body, dto.dateSent);
  }

  // ──────────── Contrôle SMS : transactions ────────────

  @Get('sms/stats')
  @ApiOperation({ summary: 'Statistiques agrégées des SMS (RGPD : aucun contenu ni identité)' })
  async smsStats(
    @Query('operator') operator?: string,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('customerId') customerId?: string,
    @Query('days') days?: string,
  ) {
    const where: any = {};
    if (operator) where.operator = operator;
    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (customerId) where.customerId = customerId;

    const daysCount = Math.min(Math.max(parseInt(days || '14', 10) || 14, 1), 90);
    const since = new Date(Date.now() - (daysCount - 1) * 86400000);
    const dateFloor = { gte: new Date(since.getFullYear(), since.getMonth(), since.getDate()) };
    const whereRange = { ...where, dateSent: dateFloor };

    const [perStatus, perOperator, perDirection, perCategory, total, rulesCount, byArbitration, byCbCategory, disagreedCount] =
      await Promise.all([
        this.prisma.smsTransaction.groupBy({ by: ['status'], where: whereRange, _count: true }),
        this.prisma.smsTransaction.groupBy({ by: ['operator'], where: whereRange, _count: true }),
        this.prisma.smsTransaction.groupBy({ by: ['direction'], where: whereRange, _count: true }),
        this.prisma.smsTransaction.groupBy({
          by: ['category'],
          where: { ...whereRange, category: { not: null } },
          _count: true,
        }),
        this.prisma.smsTransaction.count({ where: whereRange }),
        this.prisma.smsFilterRule.count({ where: { isActive: true } }),
        this.prisma.smsTransaction.groupBy({
          by: ['arbitration'],
          where: { ...whereRange, arbitration: { not: null } },
          _count: true,
        }),
        this.prisma.smsTransaction.groupBy({
          by: ['cbCategory'],
          where: { ...whereRange, cbCategory: { not: null } },
          _count: true,
        }),
        this.prisma.smsTransaction.count({ where: { ...whereRange, disagreed: true } }),
      ]);

    const perDay: { date: string; count: number }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const start = new Date(Date.now() - i * 86400000);
      const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = await this.prisma.smsTransaction.count({
        where: { ...where, dateSent: { gte: dayStart, lt: dayEnd } },
      });
      perDay.push({ date: dayStart.toISOString().slice(0, 10), count });
    }

    return {
      totals: {
        total,
        byStatus: perStatus,
        byOperator: perOperator,
        byDirection: perDirection,
        byCategory: perCategory,
        byArbitration,
        byCbCategory,
        disagreedCount,
        perDay,
      },
      rulesCount,
      filters: { operator, status, direction, customerId, days: daysCount },
    };
  }

  @Get('sms/pipeline')
  @ApiOperation({ summary: 'Config du pipeline SMS v2 + statut CamenBert' })
  async getSmsPipeline() {
    const [config, camenBertStatus] = await Promise.all([
      this.smsService.getPipelineConfig(),
      this.smsService.getCamenBertStatus(),
    ]);
    return { config, camenBertStatus };
  }

  @Patch('sms/pipeline')
  @ApiOperation({ summary: 'Mise à jour partielle de la config du pipeline SMS' })
  async updateSmsPipeline(@Body() dto: UpdateSmsPipelineDto) {
    const partial: Partial<SmsPipelineConfig> = {};
    if (dto.regexEnabled !== undefined) partial.regexEnabled = dto.regexEnabled;
    if (dto.camenbertEnabled !== undefined) partial.camenbertEnabled = dto.camenbertEnabled;
    if (dto.camenbertThreshold !== undefined) partial.camenbertThreshold = dto.camenbertThreshold;
    const config = await this.smsService.updatePipelineConfig(partial);
    return { config };
  }

  // ──────────── Contrôle SMS : règles d'ignorance ────────────

  @Get('sms/rules')
  @ApiOperation({ summary: 'Lister les règles d\'ignorance SMS' })
  async listSmsRules(@Query('customerId') customerId?: string) {
    const where: any = {};
    if (customerId) where.customerId = customerId;
    const rules = await this.prisma.smsFilterRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const customerIds = [
      ...new Set(rules.map((r) => r.customerId).filter((c): c is string => !!c)),
    ];
    const customers = customerIds.length
      ? await this.prisma.bankCustomer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, firstName: true, lastName: true, accountNumber: true },
        })
      : [];
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return rules.map((r) => ({
      ...r,
      customer: r.customerId ? customerMap.get(r.customerId) ?? null : null,
    }));
  }

  @Post('sms/rules')
  @ApiOperation({ summary: 'Créer une règle d\'ignorance SMS' })
  async createSmsRule(
    @Body()
    body: {
      customerId?: string;
      operator?: string;
      address?: string;
      keyword?: string;
      direction?: string;
      action?: string;
      description?: string;
    },
  ) {
    return this.prisma.smsFilterRule.create({
      data: {
        customerId: body.customerId ?? null,
        operator: body.operator ?? null,
        address: body.address ?? null,
        keyword: body.keyword ?? null,
        direction: body.direction ?? null,
        action: body.action ?? 'IGNORE',
        description: body.description ?? null,
      },
    });
  }

  @Patch('sms/rules/:id')
  @ApiOperation({ summary: 'Modifier une règle d\'ignorance SMS' })
  async updateSmsRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      customerId?: string;
      operator?: string;
      address?: string;
      keyword?: string;
      direction?: string;
      action?: string;
      description?: string;
    },
  ) {
    const existing = await this.prisma.smsFilterRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Règle SMS introuvable');

    const data: any = {};
    if (body.customerId !== undefined) data.customerId = body.customerId;
    if (body.operator !== undefined) data.operator = body.operator;
    if (body.address !== undefined) data.address = body.address;
    if (body.keyword !== undefined) data.keyword = body.keyword;
    if (body.direction !== undefined) data.direction = body.direction;
    if (body.action !== undefined) data.action = body.action;
    if (body.description !== undefined) data.description = body.description;

    return this.prisma.smsFilterRule.update({ where: { id }, data });
  }

  @Patch('sms/rules/:id/status')
  @ApiOperation({ summary: 'Activer/désactiver une règle SMS' })
  async toggleSmsRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
  ) {
    if (typeof body.isActive !== 'boolean') {
      throw new ConflictException('Le champ isActive doit être un booléen');
    }
    return this.prisma.smsFilterRule.update({
      where: { id },
      data: { isActive: body.isActive },
    });
  }

  @Delete('sms/rules/:id')
  @ApiOperation({ summary: 'Supprimer une règle d\'ignorance SMS' })
  async deleteSmsRule(@Param('id', ParseUUIDPipe) id: string) {
    const existing = await this.prisma.smsFilterRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Règle SMS introuvable');
    await this.prisma.smsFilterRule.delete({ where: { id } });
    return { message: 'Règle SMS supprimée' };
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('camenbert/test')
  @ApiOperation({
    summary: 'Tester le modèle CamenBert sur un SMS',
  })
  async testCamenBert(@Body() dto: CamenBertTestDto) {
    return this.smsService.debugCamenBert(dto.body);
  }

  @Get('camenbert/status')
  @ApiOperation({ summary: 'Statut du modèle CamenBert' })
  async camenBertStatus() {
    return this.smsService.getCamenBertStatus();
  }

  @Post('camenbert/load')
  @ApiOperation({ summary: 'Charger/recharger le modèle CamenBert en mémoire' })
  async loadCamenBert() {
    const ok = await this.camenBert.reload();
    return { ok, ready: this.camenBert.isReady() };
  }

  @Get('models')
  @ApiOperation({ summary: 'Lister les modèles ML avec leur statut' })
  async listModels() {
    const stats = this.modelRegistry.getStats();
    const camenBertStatus = this.smsService.getCamenBertStatus();
    const models = Object.entries(stats).map(([name, s]) => ({
      name,
      status: s.status,
      memoryMB: s.memoryMB,
      type: name === 'camenbert' ? 'ONNX (camembert-base)' : 'inconnu',
      lastUsed: s.lastUsed,
      sizeMB: 0,
    }));

    const modelPath = 'models/camenbert/camenbert-int8.onnx';
    try {
      const fs = await import('fs');
      if (fs.existsSync(modelPath)) {
        models[0].sizeMB = fs.statSync(modelPath).size / (1024 * 1024);
      }
    } catch {}

    return { models, camenBertStatus };
  }

  @Post('models/train')
  @ApiOperation({ summary: 'Lancer l\'entraînement CamenBert (async)' })
  async trainCamenBert(
    @Body()
    params: { epochs?: number; batchSize?: number; lr?: number },
  ) {
    const result = await this.camenBertTraining.start({
      epochs: params.epochs,
      batchSize: params.batchSize,
      lr: params.lr,
    });
    return result;
  }

  @Get('models/training/status')
  @ApiOperation({ summary: 'Statut de l\'entraînement en cours' })
  async trainingStatus() {
    return this.camenBertTraining.getStatus();
  }

  @Get('models/training/logs')
  @ApiOperation({ summary: 'Logs de l\'entraînement' })
  async trainingLogs(@Query('offset') offset?: string) {
    return this.camenBertTraining.getLogs(offset ? parseInt(offset, 10) : 0);
  }

  @Post('models/training/cancel')
  @ApiOperation({ summary: 'Annuler l\'entraînement' })
  async cancelTraining() {
    this.camenBertTraining.cancel();
    return { ok: true };
  }

  @Post('models/training/deploy')
  @ApiOperation({ summary: 'Déployer le modèle entraîné' })
  async deployModel() {
    return this.camenBertTraining.deploy();
  }

  @Get('models/training/stream')
  @Sse()
  @ApiOperation({ summary: 'Flux SSE des logs d\'entraînement' })
  streamTraining() {
    return this.camenBertTraining.onProgress().pipe(
      map((event) => ({
        data: JSON.stringify(event),
      })),
    );
  }

  @Get('models/regex-stats')
  @ApiOperation({ summary: 'Statistiques du parseur SMS (RegEx)' })
  async regexStats() {
    const { getPatternStats } = await import('../analytics/sources/sms/sms-parser.js');
    return getPatternStats();
  }

  @Get('models/dataset')
  @ApiOperation({ summary: 'Infos sur le dataset d\'entraînement' })
  async datasetInfo() {
    const dataPath = `${process.cwd()}/src/sms/camenbert/training/data.jsonl`;
    try {
      const fs = await import('fs');
      if (!fs.existsSync(dataPath)) {
        return { count: 0, path: dataPath, exists: false };
      }
      const content = fs.readFileSync(dataPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      const labelCount: Record<string, number> = {};
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.label) {
            labelCount[item.label] = (labelCount[item.label] ?? 0) + 1;
          }
        } catch {}
      }
      const modelPath = 'models/camenbert/camenbert-int8.onnx';
      let lastTraining: string | null = null;
      try {
        if (fs.existsSync(modelPath)) {
          lastTraining = fs.statSync(modelPath).mtime.toISOString();
        }
      } catch {}
      return { count: lines.length, path: dataPath, exists: true, labels: labelCount, lastTraining };
    } catch {
      return { count: 0, path: dataPath, exists: false };
    }
  }

  @Get('customers')
  @ApiOperation({ summary: 'Rechercher des clients bank' })
  async listCustomers(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 50);
    const skip = (Math.max(parseInt(page || '1', 10) || 1, 1) - 1) * take;

    const where: any = { deletedAt: null };
    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { accountNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.bankCustomer.findMany({
        where,
        select: { id: true, firstName: true, lastName: true, email: true, accountNumber: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bankCustomer.count({ where }),
    ]);

    return { data, total, page: Math.floor(skip / take) + 1, limit: take };
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Diffuser une notification (all, userIds, ou customerTargets)' })
  async broadcast(@Body() dto: BroadcastDto) {
    const type = dto.type ?? 'ADMIN_BROADCAST';
    const severity = dto.severity ?? 'INFO';

    if (dto.customerTargets && dto.customerTargets.length > 0) {
      const customers = await this.prisma.bankCustomer.findMany({
        where: {
          OR: [
            { id: { in: dto.customerTargets.filter((c) => /^[0-9a-f-]{36}$/i.test(c)) } },
            { email: { in: dto.customerTargets.filter((c) => !/^[0-9a-f-]{36}$/i.test(c)) } },
          ],
        },
        include: { userConnection: { select: { userId: true } } },
      });

      const userIds = customers
        .map((c) => c.userConnection?.userId)
        .filter((id): id is string => !!id);

      if (userIds.length > 0) {
        await this.notificationsService.createMany(userIds, {
          title: dto.title, body: dto.body, type: type as any, severity, link: '/',
        });
        await this.pushService.sendToMany(userIds, {
          title: dto.title, body: dto.body, data: { type },
        });
      }

      return { message: `Notification envoyée à ${userIds.length} clients` };
    }

    if (dto.target === 'all' || !dto.target) {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      await this.notificationsService.createMany(
        users.map((u) => u.id),
        { title: dto.title, body: dto.body, type: type as any, severity, link: '/' },
      );

      await this.pushService.sendToAll({
        title: dto.title,
        body: dto.body,
        data: { type },
      });

      return { message: `Notification diffusée à ${users.length} utilisateurs` };
    }

    if (Array.isArray(dto.target)) {
      await this.notificationsService.createMany(dto.target, {
        title: dto.title, body: dto.body, type: type as any, severity, link: '/',
      });

      await this.pushService.sendToMany(dto.target, {
        title: dto.title, body: dto.body, data: { type },
      });

      return { message: `Notification envoyée à ${dto.target.length} utilisateurs` };
    }

    return { message: 'Aucune cible valide' };
  }

  @Get('notifications/stats')
  @ApiOperation({ summary: "Statistiques des notifications" })
  async getNotificationStats() {
    const [totalNotifications, totalPushTokens, unreadCount, totalScheduled] =
      await Promise.all([
        this.prisma.notification.count(),
        this.prisma.pushToken.count(),
        this.prisma.notification.count({ where: { isRead: false } }),
        this.prisma.scheduledNotification.count(),
      ]);

    return {
      totalNotifications,
      totalPushTokens,
      unreadCount,
      totalScheduled,
    };
  }

  /*
   * Purge all notifications. Accepts optional filters:
   * - type: only delete notifications of a specific type
   * - before: only delete notifications older than this date
   */
  @Delete('notifications')
  @ApiOperation({ summary: "Purger les notifications (avec filtres)" })
  async purgeNotifications(@Body() dto: PurgeNotificationsDto) {
    const where: any = {};
    if (dto.type) where.type = dto.type;
    if (dto.before) where.createdAt = { lt: new Date(dto.before) };

    const { count } = await this.prisma.notification.deleteMany({ where });
    return { message: `${count} notification(s) supprimée(s)`, count };
  }

  @Get('notifications/scheduled')
  @ApiOperation({ summary: "Lister les notifications programmées" })
  async listScheduled() {
    return this.prisma.scheduledNotification.findMany({
      orderBy: { scheduledAt: 'asc' },
    });
  }

  @Post('notifications/scheduled')
  @ApiOperation({ summary: "Créer une notification programmée" })
  async createScheduled(@Body() dto: CreateScheduledNotificationDto) {
    return this.prisma.scheduledNotification.create({
      data: {
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'ADMIN_BROADCAST',
        severity: dto.severity ?? 'INFO',
        scheduledAt: new Date(dto.scheduledAt),
        recurrence: dto.recurrence ?? null,
        targetType: dto.targetType ?? 'all',
        targetIds: dto.targetIds ? (dto.targetIds as any) : undefined,
      },
    });
  }

  @Patch('notifications/scheduled/:id')
  @ApiOperation({ summary: "Modifier une notification programmée" })
  async updateScheduled(
    @Param('id') id: string,
    @Body() dto: UpdateScheduledNotificationDto,
  ) {
    const existing = await this.prisma.scheduledNotification.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Notification programmée introuvable');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.scheduledAt !== undefined) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.recurrence !== undefined) data.recurrence = dto.recurrence;
    if (dto.targetType !== undefined) data.targetType = dto.targetType;
    if (dto.targetIds !== undefined) data.targetIds = dto.targetIds as any;
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.scheduledNotification.update({
      where: { id },
      data,
    });
  }

  @Delete('notifications/scheduled/:id')
  @ApiOperation({ summary: "Supprimer une notification programmée" })
  async deleteScheduled(@Param('id') id: string) {
    const existing = await this.prisma.scheduledNotification.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Notification programmée introuvable');

    await this.prisma.scheduledNotification.delete({ where: { id } });
    return { message: 'Notification programmée supprimée' };
  }

  // ──────────── Dashboard Analytics ────────────

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Indicateurs clés pour le dashboard admin' })
  async getDashboardAnalytics() {
    const [
      userCount,
      kycStats,
      notificationStats,
      educationStats,
      quizStats,
      transactionCount,
      customerCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.bankCustomer.groupBy({
        by: ['kycStatus'],
        _count: true,
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        _count: true,
        orderBy: { _count: { id: 'desc' } },
      }),
      Promise.all([
        this.prisma.userPathProgress.count(),
        this.prisma.userPathProgress.count({ where: { completedAt: { not: null } } }),
        this.prisma.userLessonProgress.count({ where: { completed: true } }),
      ]),
      this.prisma.quizAttempt.aggregate({
        _count: true,
        _avg: { score: true },
        where: { completedAt: { not: null } },
      }),
      this.prisma.transaction.count(),
      this.prisma.bankCustomer.count({ where: { deletedAt: null } }),
    ]);

    const [totalEnrolled, completedPaths, completedLessons] = educationStats;

    return {
      users: {
        total: userCount,
      },
      kyc: kycStats.map((k) => ({ status: k.kycStatus, count: k._count })),
      notifications: notificationStats.map((n) => ({ type: n.type, count: n._count })),
      education: {
        totalEnrolled,
        completedPaths,
        completionRate: totalEnrolled > 0 ? Math.round((completedPaths / totalEnrolled) * 100) : 0,
        completedLessons,
      },
      quizzes: {
        total: quizStats._count,
        averageScore: quizStats._avg.score ? Math.round(quizStats._avg.score) : 0,
      },
      transactions: { total: transactionCount },
      customers: { total: customerCount },
    };
  }

  // ──────────── Gestion des utilisateurs ────────────

  @Get('users')
  @ApiOperation({ summary: 'Lister les utilisateurs (paginé + recherche)' })
  async listUsers(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 50);
    const skip = (Math.max(parseInt(page || '1', 10) || 1, 1) - 1) * take;

    const where: any = { deletedAt: null };
    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (role && Object.values(Role).includes(role as Role)) {
      where.role = role as Role;
    }
    if (status && Object.values(UserAccountStatus).includes(status as UserAccountStatus)) {
      where.status = status as UserAccountStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          deletedAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page: Math.floor(skip / take) + 1, limit: take };
  }

  @Post('users')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur admin' })
  async createUser(@Body() dto: CreateUserDto, @Req() req: Request) {
    const actor = (req as any).user;
    if (dto.role === Role.SUPER_ADMIN && actor?.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Seuls les SUPER_ADMIN peuvent créer des SUPER_ADMIN');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        role: dto.role,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: user.id,
      action: 'user_created',
      actorId: (req as any).user?.id,
      actorRole: (req as any).user?.role,
      after: { email: user.email, role: user.role },
      ipAddress: req?.headers?.['x-forwarded-for'] as string ?? (req as any)?.socket?.remoteAddress as string,
    });

    const appUrl = process.env.ADMIN_URL || 'http://localhost:5173/';
    const adminEmail = actor?.email;
    if (adminEmail) {
      this.mailService.sendMail({
        to: adminEmail,
        subject: `Orabank — Compte créé : ${dto.email}`,
        template: 'welcome-email',
        context: {
          email: dto.email,
          password: dto.password,
          role: dto.role,
          appUrl,
        },
      }).catch((err) => {
        const logger = new Logger('AdminController');
        logger.error(`Échec envoi email confirmation à ${adminEmail}`, err);
      });
    }

    return user;
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Détail d\'un utilisateur' })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        loginCount: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        _count: {
          select: {
            sessions: { where: { isRevoked: false } },
            notifications: true,
            pushTokens: true,
          },
        },
        bankConnections: {
          select: {
            id: true,
            role: true,
            bankCustomer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                accountNumber: true,
                customerCode: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return user;
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Modifier rôle ou statut d\'un utilisateur' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: id,
      action: dto.role !== undefined ? 'role_changed' : 'status_changed',
      actorId: (req as any).user?.id,
      actorRole: (req as any).user?.role,
      before: { role: existing.role, status: existing.status },
      after: { role: dto.role, status: dto.status },
      ipAddress: req?.headers?.['x-forwarded-for'] as string ?? (req as any)?.socket?.remoteAddress as string,
    });

    return updated;
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Supprimer définitivement un compte application (utilisateur + liens bancaires)' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    // Libère le(s) client(s) bancaire(s) en supprimant les liens applicatifs
    await this.prisma.userBankConnection.deleteMany({ where: { userId: id } });

    await this.prisma.user.delete({ where: { id } });

    await this.auditService.log({
      entityType: 'User',
      entityId: id,
      action: 'user_deleted',
      actorId: (req as any).user?.id,
      actorRole: (req as any).user?.role,
      before: { email: existing.email, role: existing.role, status: existing.status },
      ipAddress: req?.headers?.['x-forwarded-for'] as string ?? (req as any)?.socket?.remoteAddress as string,
    });

    return { message: 'Compte application supprimé' };
  }

  @Get('users/:id/sessions')
  @ApiOperation({ summary: 'Sessions actives d\'un utilisateur' })
  async getUserSessions(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.session.findMany({
      where: { userId: id, isRevoked: false },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete('users/:id/sessions')
  @ApiOperation({ summary: 'Révoquer toutes les sessions d\'un utilisateur' })
  async revokeUserSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const result = await this.prisma.session.updateMany({
      where: { userId: id, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.auditService.log({
      entityType: 'User',
      entityId: id,
      action: 'sessions_revoked',
      actorId: (req as any).user?.id,
      actorRole: (req as any).user?.role,
      before: { sessionCount: result.count },
      ipAddress: req?.headers?.['x-forwarded-for'] as string ?? (req as any)?.socket?.remoteAddress as string,
    });

    return { message: `${result.count} session(s) révoquée(s)` };
  }

  // ──────────── Logs ────────────

  @Get('auth-logs')
  @ApiOperation({ summary: 'Historique des logs d\'authentification' })
  async listAuthLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('success') success?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(parseInt(limit || '25', 10) || 25, 1), 100);
    const skip = (Math.max(parseInt(page || '1', 10) || 1, 1) - 1) * take;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (success !== undefined) where.success = success === 'true';
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.authLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          success: true,
          email: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.authLog.count({ where }),
    ]);

    return { data, total, page: Math.floor(skip / take) + 1, limit: take };
  }

  @Get('auth-logs/:id')
  @ApiOperation({ summary: 'Détail d\'un log d\'authentification' })
  async getAuthLog(@Param('id') id: string) {
    const log = await this.prisma.authLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Log introuvable');
    return log;
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Historique des logs d\'audit' })
  async listAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(parseInt(limit || '25', 10) || 25, 1), 100);
    const skip = (Math.max(parseInt(page || '1', 10) || 1, 1) - 1) * take;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (actorId) where.actorId = actorId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page: Math.floor(skip / take) + 1, limit: take };
  }

  @Delete('auth-logs')
  @ApiOperation({ summary: 'Purger les logs d\'authentification' })
  async purgeAuthLogs(@Body() dto: PurgeNotificationsDto) {
    const where: any = {};
    if (dto.before) where.createdAt = { lt: new Date(dto.before) };

    const { count } = await this.prisma.authLog.deleteMany({ where });
    return { message: `${count} log(s) d\'auth supprimé(s)`, count };
  }

  @Delete('audit-logs')
  @ApiOperation({ summary: 'Purger les logs d\'audit' })
  async purgeAuditLogs(@Body() dto: PurgeNotificationsDto) {
    const where: any = {};
    if (dto.before) where.createdAt = { lt: new Date(dto.before) };

    const { count } = await this.prisma.auditLog.deleteMany({ where });
    return { message: `${count} log(s) d\'audit supprimé(s)`, count };
  }

  // ──────────── Eligibility (proxy vers EligibilityService) ────────────

  @Get('eligibility/dashboard/:customerId')
  @ApiOperation({ summary: 'Tableau de bord éligibilité pour un client' })
  async eligibilityDashboard(@Param('customerId') customerId: string) {
    return this.eligibilityService.dashboard(customerId);
  }

  @Get('eligibility/improvement-plan/:customerId')
  @ApiOperation({ summary: 'Plan d\'amélioration éligibilité' })
  async eligibilityImprovementPlan(@Param('customerId') customerId: string) {
    return this.eligibilityService.improvementPlan(customerId);
  }

  @Post('eligibility/evaluate')
  @ApiOperation({ summary: 'Évaluer l\'éligibilité d\'un client pour un produit' })
  async eligibilityEvaluate(@Body() body: { customerId: string; productCode: string; inputs?: Record<string, any>; mode?: string }) {
    return this.eligibilityService.evaluateEligibility(
      body.customerId,
      body.productCode,
      body.inputs,
      body.mode as 'matrix' | 'rules',
    );
  }

  @Post('eligibility/simulate')
  @ApiOperation({ summary: 'Simuler l\'impact d\'ajustements sur l\'éligibilité' })
  async eligibilitySimulate(@Body() body: { customerId: string; productCode: string; adjustments: Record<string, number>; mode?: string }) {
    return this.eligibilityService.simulate(body as any);
  }

  @Get('eligibility/products')
  @ApiOperation({ summary: 'Lister les produits bancaires' })
  async eligibilityProducts() {
    return this.eligibilityService.listProducts();
  }

  @Get('eligibility/products/:code/rules')
  @ApiOperation({ summary: 'Règles d\'un produit' })
  async eligibilityProductRules(@Param('code') code: string) {
    return this.eligibilityService.getProductRules(code);
  }
}
