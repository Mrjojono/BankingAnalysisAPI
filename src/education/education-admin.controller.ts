import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EducationService } from './education.service';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateAdviceLinkDto } from './dto/create-advice-link.dto';

@ApiTags('Admin - Education')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/admin/education')
export class EducationAdminController {
  constructor(private readonly educationService: EducationService) {}

  // ========== Paths ==========

  @Get('paths')
  @ApiOperation({ summary: 'Lister tous les parcours (admin)' })
  listAllPaths() {
    return this.educationService.listAllPaths();
  }

  @Post('paths')
  @ApiOperation({ summary: 'Créer un parcours' })
  createPath(@Body() dto: CreatePathDto) {
    return this.educationService.createPath(dto);
  }

  @Patch('paths/:id')
  @ApiOperation({ summary: 'Modifier un parcours' })
  updatePath(@Param('id') id: string, @Body() dto: UpdatePathDto) {
    return this.educationService.updatePath(id, dto);
  }

  @Delete('paths/:id')
  @ApiOperation({ summary: 'Supprimer (soft) un parcours' })
  deletePath(@Param('id') id: string) {
    return this.educationService.deletePath(id);
  }

  // ========== Lessons ==========

  @Get('lessons')
  @ApiOperation({ summary: 'Lister toutes les leçons (admin)' })
  listAllLessons(@Query('pathId') pathId?: string) {
    return this.educationService.listAllLessons(pathId);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Détail d\'une leçon (admin)' })
  getLesson(@Param('id') id: string) {
    return this.educationService.getLesson(id);
  }

  @Post('lessons')
  @ApiOperation({ summary: 'Créer une leçon' })
  createLesson(@Body() dto: CreateLessonDto) {
    return this.educationService.createLesson(dto);
  }

  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Modifier une leçon' })
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.educationService.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Archiver une leçon' })
  deleteLesson(@Param('id') id: string) {
    return this.educationService.deleteLesson(id);
  }

  // ========== Advice Links ==========

  @Post('advice-links')
  @ApiOperation({ summary: 'Lier un adviceType à une leçon' })
  createAdviceLink(@Body() dto: CreateAdviceLinkDto) {
    return this.educationService.createAdviceLink(dto);
  }

  @Delete('advice-links/:id')
  @ApiOperation({ summary: 'Supprimer un lien adviceType → leçon' })
  deleteAdviceLink(@Param('id') id: string) {
    return this.educationService.deleteAdviceLink(id);
  }

  // ========== Canvas ==========

  @Post('canvas/save')
  @ApiOperation({ summary: 'Sauvegarder les connexions du canvas' })
  saveCanvas(@Body() body: { edges: { source: string; target: string }[] }) {
    return this.educationService.saveCanvas(body.edges);
  }

  // ========== Stats ==========

  @Get('stats/paths')
  @ApiOperation({ summary: 'Statistiques des parcours' })
  getPathStats() {
    return this.educationService.getPathStats();
  }

  @Get('stats/lessons')
  @ApiOperation({ summary: 'Statistiques des leçons' })
  getLessonStats() {
    return this.educationService.getLessonStats();
  }
}
