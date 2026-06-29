/**
 * Fait le lien entre le controller et le moteur d'éligibilité.
 * Utilise le moteur matriciel par défaut (MatrixEligibilityEngine).
 * Le moteur à base de règles (EligibilityEngine) reste accessible
 * avec mode='rules' pour comparaison.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EligibilityEngine } from './engines/eligibility.engine';
import { MatrixEligibilityEngine } from './matrix/matrix-eligibility.engine';
import { NotificationsService } from '../notifications/notifications.service';
import { EducationService } from '../education/education.service';
import type { EligibilityResult } from './types';

@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);

  constructor(
    private readonly ruleEngine: EligibilityEngine,
    private readonly matrixEngine: MatrixEligibilityEngine,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly educationService: EducationService,
  ) {}

  /**
   * Évalue l'éligibilité d'un client pour un produit.
   * Par défaut utilise le moteur matriciel (mode 'matrix').
   * Passer mode='rules' pour utiliser le moteur à base de règles.
   */
  async evaluateEligibility(
    customerId: string,
    productCode: string,
    inputs?: Record<string, number | boolean | string>,
    mode: 'matrix' | 'rules' = 'matrix',
  ): Promise<EligibilityResult> {
    const result =
      mode === 'rules'
        ? await this.ruleEngine.evaluate(customerId, productCode, inputs ?? {})
        : await this.matrixEngine.evaluate(customerId, productCode, inputs ?? {});

    try {
      if (result.status === 'ELIGIBLE' || result.status === 'PARTIAL') {
        const bankCustomer = await this.prisma.bankCustomer.findUnique({
          where: { id: customerId },
          include: { userConnection: true },
        });

        const userId = bankCustomer?.userConnection?.userId;
        if (userId) {
          const product = await this.prisma.bankProduct.findUnique({
            where: { code: productCode },
          });

          await this.notificationsService.create(userId, {
            type: 'ELIGIBILITY',
            title: result.status === 'ELIGIBLE' ? 'Vous êtes éligible !' : 'Éligibilité partielle',
            body: `Le produit "${product?.name ?? productCode}" vous est accessible.`,
            severity: result.status === 'ELIGIBLE' ? 'INFO' : 'WARNING',
            data: { productCode, status: result.status, score: result.globalScore },
            link: '/eligibility',
          });

          const lesson = await this.prisma.lesson.findFirst({
            where: { relatedProductId: product?.id, status: 'PUBLISHED' },
          });
          if (lesson) {
            await this.notificationsService.create(userId, {
              type: 'LESSON_RECOMMENDED',
              title: `Découvrez : ${lesson.title}`,
              body: `Une leçon pour mieux comprendre ce produit.`,
              severity: 'INFO',
              link: `/education/lessons/${lesson.id}`,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Erreur notification éligibilité pour ${customerId}:`,
        error,
      );
    }

    return result;
  }

  /**
   * Liste tous les produits bancaires actifs avec le nombre de règles
   * Utile pour afficher la liste dans l'UI et laisser l'utilisateur choisir
   */
  async listProducts() {
    return this.prisma.bankProduct.findMany({
      where: { isActive: true },
      select: {
        code: true, // ex: "COMPTES_PART"
        name: true, // ex: "Comptes — Particuliers"
        description: true, // Description du produit
        category: true, // ex: "ACCOUNT", "LOAN", "CARD"
        _count: { select: { rules: true } }, // Nombre de règles associées
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Récupère les règles d'un produit (tous types : ELIGIBILITY, FEE, INTEREST…)
   * Utile pour afficher les conditions générales dans l'UI
   */
  async getProductRules(productCode: string) {
    const product = await this.prisma.bankProduct.findUnique({
      where: { code: productCode },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: [{ type: 'asc' }, { priority: 'desc' }],
          select: {
            code: true, // Code unique de la règle
            label: true, // Nom affichable
            description: true, // Description en français
            type: true, // ELIGIBILITY, FEE, LIMIT, INTEREST, VALUE_DATE
            field: true, // Champ associé (métier ou technique)
            operator: true, // Opérateur de comparaison
            value: true, // Valeur seuil principale
            valueMin: true, // Valeur min (pour BETWEEN)
            valueMax: true, // Valeur max (pour BETWEEN)
            percentage: true, // Pourcentage (pour taux)
            weight: true, // Poids dans le score
            priority: true, // Priorité d'affichage
          },
        },
      },
    });

    if (!product) throw new Error(`Produit "${productCode}" introuvable`);

    return product;
  }
}
