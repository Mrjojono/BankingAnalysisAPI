import { Module } from '@nestjs/common';
import { MatrixInterpreterEngine } from './matrix-interpreter.engine';

/**
 * Module du moteur matriciel.
 *
 * Fournit MatrixInterpreterEngine qui a la MÊME interface
 * que InterpreterEngine (interpret(ctx) → AdviceIntent[]).
 *
 * On peut donc remplacer l'un par l'autre dans AnalyticsModule
 * sans toucher au reste du code.
 */
@Module({
  providers: [MatrixInterpreterEngine],
  exports: [MatrixInterpreterEngine],
})
export class MatrixModule {}
