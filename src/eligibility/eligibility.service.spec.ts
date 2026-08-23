import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityService } from './eligibility.service';

jest.mock('natural', () => ({
  BayesClassifier: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    train: jest.fn(),
    classify: jest.fn(() => 'DIVERS'),
  })),
}));
import { EligibilityEngine } from './engines/eligibility.engine';
import { MatrixEligibilityEngine } from './matrix/matrix-eligibility.engine';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EducationService } from '../education/education.service';
import { OverviewService } from '../analytics/overview/overview.service';

describe('EligibilityService', () => {
  let service: EligibilityService;

  const mockEligibilityEngine = {
    evaluate: jest.fn(),
  };

  const mockMatrixEngine = {
    evaluate: jest.fn(),
  };

  const mockPrisma = {
    bankCustomer: {
      findUnique: jest.fn(),
    },
    bankProduct: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    lesson: {
      findFirst: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockEducationService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EligibilityService,
        { provide: EligibilityEngine, useValue: mockEligibilityEngine },
        { provide: MatrixEligibilityEngine, useValue: mockMatrixEngine },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OverviewService, useValue: {} },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EducationService, useValue: mockEducationService },
      ],
    }).compile();
    service = module.get<EligibilityService>(EligibilityService);
  });

  it('should return consistent results across both modes for same input', async () => {
    const customerId = 'test-customer-id';
    const productCode = 'COMPTES_PART';
    const inputs = { revenue: 500000, existingLoans: 0 };

    mockEligibilityEngine.evaluate.mockResolvedValue({
      status: 'ELIGIBLE',
      globalScore: 75,
      details: { rules: [] },
    });

    mockMatrixEngine.evaluate.mockResolvedValue({
      status: 'ELIGIBLE',
      globalScore: 80,
      details: { matrix: {} },
    });

    const rulesResult = await service.evaluateEligibility(customerId, productCode, inputs, 'rules');
    const matrixResult = await service.evaluateEligibility(customerId, productCode, inputs, 'matrix');

    expect(rulesResult).toBeDefined();
    expect(matrixResult).toBeDefined();
    expect(rulesResult.status).toBe('ELIGIBLE');
    expect(matrixResult.status).toBe('ELIGIBLE');
  });

  describe('notifications éligibilité cohérentes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.bankCustomer.findUnique.mockResolvedValue({
        id: 'test-customer-id',
        userConnection: { userId: 'test-user-id' },
      });
      mockPrisma.bankProduct.findUnique.mockResolvedValue({
        id: 'prod-1',
        code: 'CREDIT_CONSO_PART',
        name: 'Crédit à la Consommation — Particuliers',
      });
      mockPrisma.lesson.findFirst.mockResolvedValue(null);
    });

    it('ne crée aucune notification pour un produit sans règle ELIGIBILITY', async () => {
      mockMatrixEngine.evaluate.mockResolvedValue({
        status: 'ELIGIBLE',
        globalScore: 0,
        maxScore: 0,
        scorePercent: 100,
        hasEligibilityRules: false,
        ruleResults: [],
        infoRules: [],
        passedRules: [],
        failedRules: [],
        partialRules: [],
      });

      await service.evaluateEligibility(
        'test-customer-id',
        'CREDIT_CONSO_PART',
        {},
        'matrix',
      );

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('crée une notification « Vous êtes éligible ! » pour un produit réellement évalué', async () => {
      mockMatrixEngine.evaluate.mockResolvedValue({
        status: 'ELIGIBLE',
        globalScore: 80,
        maxScore: 100,
        scorePercent: 80,
        hasEligibilityRules: true,
        ruleResults: [],
        infoRules: [],
        passedRules: [],
        failedRules: [],
        partialRules: [],
      });

      await service.evaluateEligibility(
        'test-customer-id',
        'COMPTES_PART',
        {},
        'matrix',
      );

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          type: 'ELIGIBILITY',
          title: 'Vous êtes éligible !',
        }),
      );
    });

    it('crée une notification PARTIAL au corps honnête, sans « vous est accessible »', async () => {
      mockMatrixEngine.evaluate.mockResolvedValue({
        status: 'PARTIAL',
        globalScore: 55,
        maxScore: 100,
        scorePercent: 55,
        hasEligibilityRules: true,
        ruleResults: [],
        infoRules: [],
        passedRules: [],
        failedRules: [],
        partialRules: [],
      });

      await service.evaluateEligibility(
        'test-customer-id',
        'COMPTES_PART',
        {},
        'matrix',
      );

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          type: 'ELIGIBILITY',
          title: 'Éligibilité partielle',
        }),
      );
      const [, notification] =
        mockNotificationsService.create.mock.calls[0];
      expect(notification.body).not.toContain('vous est accessible');
    });
  });
});
