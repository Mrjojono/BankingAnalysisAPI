import { IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerEntryDto {
  questionId: string;
  choiceId: string;
}

export class SubmitQuizDto {
  @ApiProperty({
    oneOf: [
      { type: 'array', items: { type: 'number' } },
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            questionId: { type: 'string' },
            choiceId: { type: 'string' },
          },
        },
      },
    ],
  })
  @IsArray()
  answers: { questionId: string; choiceId: string }[] | number[];
}
