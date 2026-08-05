import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const RULE_TYPES = ['ELIGIBILITY', 'LIMIT', 'FEE', 'VALUE_DATE', 'INTEREST'] as const;
const RULE_OPERATORS = [
  'GREATER_THAN',
  'LESS_THAN',
  'EQUALS',
  'GREATER_OR_EQUAL',
  'LESS_OR_EQUAL',
  'BETWEEN',
  'NOT_EQUALS',
  'IN',
  'NOT_IN',
] as const;
const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP'] as const;
const RULE_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'PER_TRANSACTION'] as const;

export class CreateRuleDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: RULE_TYPES })
  @IsIn(RULE_TYPES)
  type: string;

  @ApiProperty()
  @IsString()
  field: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: RULE_OPERATORS })
  @IsOptional()
  @IsIn(RULE_OPERATORS)
  operator?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  valueMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  valueMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  flatAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({ enum: CURRENCIES })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: string;

  @ApiPropertyOptional({ enum: RULE_PERIODS })
  @IsOptional()
  @IsIn(RULE_PERIODS)
  period?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
