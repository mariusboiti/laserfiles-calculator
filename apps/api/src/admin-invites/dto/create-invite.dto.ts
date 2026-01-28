import { IsEmail, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminInviteDto {
  @ApiProperty({ description: 'Email of the recipient (will be normalized to lowercase)' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Number of AI credits to grant', default: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  creditsGrant?: number;

  @ApiPropertyOptional({ description: 'Duration of PRO access in days', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Internal note (e.g., Facebook group name)' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Days until invite expires', default: 14 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  inviteValidityDays?: number;
}
