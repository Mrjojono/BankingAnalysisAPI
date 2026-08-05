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
});
