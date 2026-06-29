import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../auth/user-id.decorator';
import { SavingsService } from './savings.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@ApiTags('Savings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get('goals')
  @ApiOperation({ summary: 'Lister les objectifs d\'épargne' })
  listGoals(@UserId() userId: string) {
    return this.savingsService.listGoals(userId);
  }

  @Get('goals/:id')
  @ApiOperation({ summary: 'Détail d\'un objectif' })
  getGoal(@UserId() userId: string, @Param('id') id: string) {
    return this.savingsService.getGoal(id, userId);
  }

  @Post('goals')
  @ApiOperation({ summary: 'Créer un objectif d\'épargne' })
  createGoal(@UserId() userId: string, @Body() dto: CreateSavingsGoalDto) {
    return this.savingsService.createGoal(userId, dto);
  }

  @Patch('goals/:id')
  @ApiOperation({ summary: 'Modifier un objectif' })
  updateGoal(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.savingsService.updateGoal(id, userId, dto);
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Supprimer un objectif' })
  deleteGoal(@UserId() userId: string, @Param('id') id: string) {
    return this.savingsService.deleteGoal(id, userId);
  }
}
