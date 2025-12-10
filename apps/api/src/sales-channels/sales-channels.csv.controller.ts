import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SalesChannelsExternalOrdersService } from './sales-channels.external-orders.service';

class CsvImportDto {
  @IsString()
  @IsNotEmpty()
  csv!: string;

  @IsOptional()
  @IsString()
  connectionName?: string;
}

@ApiTags('sales-channels')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales-channels/csv')
export class SalesChannelsCsvController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalOrders: SalesChannelsExternalOrdersService,
  ) {}

  private parseCsv(csv: string): Record<string, string>[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }

    const header = lines[0]
      .split(',')
      .map((h) => h.trim())
      .filter((h) => h.length > 0)
      .map((h) => h.toLowerCase());

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.every((p) => !p.trim())) continue;
      const row: Record<string, string> = {};
      header.forEach((key, idx) => {
        row[key] = (parts[idx] ?? '').trim();
      });
      rows.push(row);
    }

    return rows;
  }

  private pick(row: Record<string, string>, keys: string[]): string | undefined {
    for (const key of keys) {
      const v = row[key.toLowerCase()];
      if (v && v.length > 0) return v;
    }
    return undefined;
  }

  @Roles('ADMIN')
  @Post('import')
  async importCsv(@Body() body: CsvImportDto) {
    const name = body.connectionName || 'CSV Import';

    const connection = await this.prisma.storeConnection.create({
      data: {
        name,
        channel: 'CSV' as any,
        status: 'CONNECTED' as any,
        credentialsJson: {},
        settingsJson: {},
      },
    });

    // Minimal parsing: split by lines and ignore header details for now.
    const lines = body.csv.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // TODO: Implement robust CSV parsing and map to ExternalOrder/ExternalOrderItem.
    // For now, we just acknowledge the import and return the created connection id.

    return {
      connectionId: connection.id,
      importedLines: lines.length,
      message:
        'CSV import endpoint stubbed. In a later step, rows will be converted into ExternalOrders.',
    };
  }
}
