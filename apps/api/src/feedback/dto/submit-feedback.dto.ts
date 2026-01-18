import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitFeedbackDto {
  @IsString()
  @IsIn(['feedback', 'bug'])
  type!: 'feedback' | 'bug';

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tool?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
