import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OffcutsService } from './offcuts.service';

@ApiTags('offcuts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('batches')
export class OffcutsBatchSuggestionsController {
  constructor(private readonly offcutsService: OffcutsService) {}

  @Get(':id/offcut-suggestions')
  async batchSuggestions(@Param('id') id: string) {
    return this.offcutsService.suggestionsForBatch(id);
  }
}
