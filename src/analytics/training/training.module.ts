import { Module } from '@nestjs/common';
import { TrainCommand } from './train-command';

@Module({
  providers: [TrainCommand],
  exports: [TrainCommand],
})
export class TrainingModule {}
