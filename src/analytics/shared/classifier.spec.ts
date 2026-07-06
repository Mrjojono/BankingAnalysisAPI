import { Test, TestingModule } from '@nestjs/testing';
import { Classifier } from './classifier';
import { RedisService } from '../../redis/redis.service';

jest.mock('natural', () => ({
  BayesClassifier: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    train: jest.fn(),
    classify: jest.fn(() => 'DIVERS'),
  })),
}));

describe('Classifier', () => {
  let classifier: Classifier;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Classifier,
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), delete: jest.fn() } },
      ],
    }).compile();
    classifier = module.get<Classifier>(Classifier);
    classifier['initClassifier']();
  });

  it('should classify "ACHAT CARBURANT" as CARBURANT', async () => {
    const result = await classifier.categorizeWithCache('ACHAT CARBURANT');
    expect(result).toBe('CARBURANT');
  });
});
