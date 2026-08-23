import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { MatrixProduct, MatrixRule, EligibilityCache } from './types';

const CACHE_KEY = 'eligibility:matrix:products';
const CACHE_TTL = 3600;

@Injectable()
export class EligibilityMatrixBuilder {
  private readonly logger = new Logger(EligibilityMatrixBuilder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async loadProducts(): Promise<MatrixProduct[]> {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) {
      try {
        const data: EligibilityCache = JSON.parse(cached);
        this.logger.log(
          `Matrice éligibilité chargée depuis le cache (${data.products.length} produits)`,
        );
        return data.products;
      } catch {
        this.logger.warn('Cache corrompu, reconstruction de la matrice');
      }
    }

    const products = await this.buildFromDatabase();
    await this.cacheProducts(products);

    return products;
  }

  async invalidateCache(): Promise<void> {
    await this.redis.delete(CACHE_KEY);
    this.logger.log('Cache de la matrice éligibilité invalidé');
  }

  private async buildFromDatabase(): Promise<MatrixProduct[]> {
    const dbProducts = await this.prisma.bankProduct.findMany({
      where: {
        isActive: true,
        rules: {
          some: { type: 'ELIGIBILITY', isActive: true },
        },
      },
      include: {
        rules: {
          where: { type: 'ELIGIBILITY', isActive: true },
          orderBy: { priority: 'desc' },
          select: {
            id: true,
            code: true,
            label: true,
            field: true,
            operator: true,
            value: true,
            valueMin: true,
            valueMax: true,
            weight: true,
          },
        },
      },
    });

    this.logger.log(
      `Matrice éligibilité construite : ${dbProducts.length} produits avec règles ELIGIBILITY`,
    );

    return dbProducts.map((p) => ({
      code: p.code,
      name: p.name,
      description: p.description,
      rules: p.rules,
    }));
  }

  private async cacheProducts(products: MatrixProduct[]): Promise<void> {
    const data: EligibilityCache = {
      products,
      builtAt: new Date().toISOString(),
    };
    await this.redis.set(CACHE_KEY, JSON.stringify(data), CACHE_TTL);
  }
}
