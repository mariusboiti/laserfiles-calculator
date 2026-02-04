import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ description: 'Search by email (case-insensitive contains)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by plan status', enum: ['ACTIVE', 'TRIALING', 'CANCELED', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size (max 100)', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;
}

export class AddCreditsDto {
  @ApiProperty({ description: 'Amount of credits to add', minimum: 1, maximum: 100000 })
  @IsInt()
  @Min(1)
  @Max(100000)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Reason for adding credits', minLength: 3 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason: string;
}

export class ForceSyncDto {
  @ApiProperty({ description: 'Reason for force sync', minLength: 3 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason: string;
}

export class UpdateEntitlementPlanDto {
  @ApiProperty({
    description: 'New entitlement plan',
    enum: ['INACTIVE', 'TRIALING', 'ACTIVE', 'CANCELED'],
  })
  @IsString()
  @IsNotEmpty()
  plan: string;

  @ApiPropertyOptional({
    description: 'Optional trial end date (ISO string). Used when plan=TRIALING.',
    example: '2026-02-10T20:59:25.977Z',
  })
  @IsOptional()
  @IsString()
  trialEndsAt?: string;

  @ApiProperty({ description: 'Reason for plan change', minLength: 3 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason: string;
}
