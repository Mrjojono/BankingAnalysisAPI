/**
 * eligibility.controller.ts — Contrôleur REST du module Eligibility
 *
 * Endpoints :
 *   POST /eligibility/evaluate      → Évaluer l'éligibilité
 *   GET  /eligibility/products      → Lister les produits
 *   GET  /eligibility/products/:code/rules → Détail des règles d'un produit
 *
 * Tous les endpoints sont protégés par JWT (JwtAuthGuard).
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EligibilityService } from './eligibility.service';
import { EvaluateEligibilityDto, SimulateEligibilityDto } from './dto/eligibility.dto';

@ApiTags('Eligibility') // Groupe Swagger
@ApiBearerAuth() // Authentification requise
@UseGuards(JwtAuthGuard)
@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly service: EligibilityService) {}

  /**
   * POST /eligibility/evaluate
   *
   * Évalue l'éligibilité d'un client pour un produit bancaire.
   *
   * Utilise automatiquement les métriques analytics du client (calculées
   * depuis ses transactions) et les valeurs fournies dans "inputs".
   *
   * Corps de la requête :
   * {
   *   "customerId": "3dc5213d-...",   // ID du client bancaire
   *   "productCode": "COMPTES_PART",   // Code du produit
   *   "inputs": {                       // (optionnel) valeurs spécifiques
   *     "dat_montant_min": 10000000     //   montant du dépôt souhaité
   *   }
   * }
   */
  @Post('evaluate')
  @ApiOperation({
    summary: "Évaluer l'éligibilité d'un client pour un produit",
    description:
      'Utilise le moteur matriciel (mode=matrix) par defaut. ' +
      'Les métriques analytics du client sont calculees automatiquement. ' +
      'Les inputs fournis (ex: montant souhaite) sont combines aux metriques ' +
      'pour le calcul vectoriel.',
  })
  async evaluate(@Body() dto: EvaluateEligibilityDto) {
    return this.service.evaluateEligibility(
      dto.customerId,
      dto.productCode,
      dto.inputs,
      dto.mode,
    );
  }

  /**
   * GET /eligibility/products
   *
   * Retourne la liste de tous les produits bancaires actifs
   * avec le nombre de règles associées à chacun.
   */
  @Get('products')
  @ApiOperation({ summary: 'Lister tous les produits bancaires actifs' })
  async listProducts() {
    return this.service.listProducts();
  }

  /**
   * GET /eligibility/products/:code/rules
   *
   * Retourne toutes les règles d'un produit (tous types confondus :
   * ELIGIBILITY, FEE, INTEREST, LIMIT, VALUE_DATE).
   *
   * Utile pour afficher les conditions générales dans l'UI.
   */
  @Get('products/:code/rules')
  @ApiOperation({ summary: "Obtenir les regles d'un produit" })
  async getProductRules(@Param('code') code: string) {
    return this.service.getProductRules(code);
  }

  @Post('simulate')
  @ApiOperation({ summary: "Simuler l'impact d'ajustements sur l'éligibilité", description: 'Permet de tester des scénarios "what if" en modifiant des métriques (ex: monthlyIncome, debtRatio) pour voir l\'impact sur le score.' })
  async simulate(@Body() dto: SimulateEligibilityDto) {
    return this.service.simulate(dto);
  }

  @Get('improvement-plan/:customerId')
  @ApiOperation({ summary: "Plan d'amélioration de l'éligibilité", description: 'Liste toutes les règles non respectées avec des conseils personnalisés et le score potentiel si elles étaient corrigées.' })
  async improvementPlan(@Param('customerId') customerId: string) {
    return this.service.improvementPlan(customerId);
  }

  @Get('dashboard/:customerId')
  @ApiOperation({ summary: "Tableau de bord éligibilité", description: 'Vue d\'ensemble des scores éligibilité pour tous les produits, avec les règles critiques.' })
  async dashboard(@Param('customerId') customerId: string) {
    return this.service.dashboard(customerId);
  }
}
