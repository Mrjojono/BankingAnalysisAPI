import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CamenBertTestDto {
  @ApiProperty({ example: 'Virement de 50000 FCFA', description: 'Texte du SMS à tester' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
