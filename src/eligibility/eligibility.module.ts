/**
 *
 * Dépendances :
 *   - AuthModule      → fournit JwtAuthGuard (protection des endpoints)
 *   - AnalyticsModule → fournit OverviewService (métriques client)
 *
 * Providers :
 *   - EligibilityService   → couche service (orchestration)
 *   - EligibilityEngine    → moteur d'éligibilité (logique métier)
 *   - RuleEvaluator        → évaluateur individuel de règles
 *   - PrismaService        → accès base de données
 *
 * Le module exporte EligibilityService pour que d'autres modules
 * puissent l'utiliser (ex: module de scoring ou de recommandation).
 */

import { Module } from '@nestjs/common';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';
import { EligibilityEngine } from './engines/eligibility.engine';
import { RuleEvaluator } from './engines/rule-evaluator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    AuthModule, // Pour le guard JWT (authentification)
    AnalyticsModule, // Pour OverviewService (métriques client)
  ],
  controllers: [EligibilityController],
  providers: [
    EligibilityService, // Service exposé au controller
    EligibilityEngine, // Moteur d'éligibilité
    RuleEvaluator, // Évaluateur de règles unitaire
    PrismaService, // Accès BDD
  ],
  exports: [EligibilityService],
})
export class EligibilityModule {}
