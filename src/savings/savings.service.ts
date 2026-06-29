import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@Injectable()
export class SavingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listGoals(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map((g) => this.enrich(g));
  }

  async getGoal(id: string, userId: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!goal) throw new NotFoundException('Objectif introuvable');
    return this.enrich(goal);
  }

  async createGoal(userId: string, dto: CreateSavingsGoalDto) {
    const goal = await this.prisma.savingsGoal.create({
      data: {
        userId,
        name: dto.name || dto.label || '',
        targetAmount: dto.targetAmount,
        targetDate: new Date(dto.targetDate),
        savedAmount: 0,
        status: 'ACTIVE',
      },
    });
    return this.enrich(goal);
  }

  async updateGoal(id: string, userId: string, dto: UpdateSavingsGoalDto) {
    const existing = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Objectif introuvable');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    else if (dto.label !== undefined) data.name = dto.label;
    if (dto.targetAmount !== undefined) data.targetAmount = dto.targetAmount;
    if (dto.savedAmount !== undefined) data.savedAmount = dto.savedAmount;
    if (dto.targetDate !== undefined) data.targetDate = new Date(dto.targetDate);
    if (dto.status !== undefined) data.status = dto.status;

    const goal = await this.prisma.savingsGoal.update({
      where: { id },
      data,
    });
    return this.enrich(goal);
  }

  async deleteGoal(id: string, userId: string) {
    const existing = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Objectif introuvable');
    await this.prisma.savingsGoal.delete({ where: { id } });
  }

  private enrich(goal: {
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    targetDate: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const monthsRemaining = Math.max(
      0,
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
        targetDate.getMonth() -
        now.getMonth(),
    );
    const remainingAmount = goal.targetAmount - goal.savedAmount;
    const requiredMonthlySaving =
      monthsRemaining > 0 ? Math.ceil(remainingAmount / monthsRemaining) : 0;
    const progressPercent =
      goal.targetAmount > 0
        ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
        : 0;
    const isBehind = goal.status === 'ACTIVE' && monthsRemaining <= 0 && remainingAmount > 0;
    const status = isBehind ? 'BEHIND' : goal.status === 'COMPLETED' ? 'ON_TRACK' : goal.status;

    return {
      id: goal.id,
      name: goal.name,
      label: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      currentAmount: goal.savedAmount,
      progressPercent,
      targetDate: goal.targetDate.toISOString(),
      deadline: goal.targetDate.toISOString().slice(0, 7),
      monthsRemaining,
      requiredMonthlySaving,
      monthlyContribution: requiredMonthlySaving,
      status,
    };
  }
}
