import { Module } from '@nestjs/common';
import { FragmentSelector } from './fragment-selector';
import { DocumentPlanner } from './document-planner';
import { NLGEngineService } from './nlg-engine.service';

@Module({
  providers: [FragmentSelector, DocumentPlanner, NLGEngineService],
  exports: [FragmentSelector, DocumentPlanner, NLGEngineService],
})
export class MessagesModule {}
