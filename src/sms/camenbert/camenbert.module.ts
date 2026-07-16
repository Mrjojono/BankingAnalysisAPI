import { Module, Global } from '@nestjs/common';
import { CamenBertService } from './camenbert.service';
import { CamenBertTrainingService } from './camenbert-training.service';

@Global()
@Module({
  providers: [CamenBertService, CamenBertTrainingService],
  exports: [CamenBertService, CamenBertTrainingService],
})
export class CamenBertModule {}
