import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../auth/user-id.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: "Statistiques financières de l'utilisateur" })
  async getStats(@UserId() userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bankConnections: {
          include: {
            bankCustomer: {
              include: {
                accounts: {
                  include: { account: true },
                },
              },
            },
          },
        },
      },
    });

    const customer = user?.bankConnections?.[0]?.bankCustomer;
    if (!customer) {
      return { deposits: 0, loans: 0, savings: 0, score: 0 };
    }

    let deposits = 0;
    let loans = 0;
    let savings = 0;

    for (const ba of customer.accounts) {
      const acc = ba.account;
      if (ba.accountType === 'SAVINGS') {
        savings += Number(acc.settledCredit) - Number(acc.settledDebit);
      } else if (ba.accountType === 'LOAN') {
        loans += Number(acc.settledDebit);
      } else {
        deposits += Number(acc.settledCredit);
      }
    }

    const score = Math.min(
      100,
      Math.max(0, Math.round((deposits / 1_000_000) * 50 + (savings / 500_000) * 30 + (loans > 0 ? 10 : 20))),
    );

    return { deposits, loans, savings, score };
  }
}
