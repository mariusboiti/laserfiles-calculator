import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

  @Get('listings')
  listListings(
    @Query('userId') userId?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: any,
    @Query('limit') limit?: string,
  ) {
    return this.service.listListings({
      userId,
      platform,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('listings/:id')
  getListing(@Param('id') id: string) {
    return this.service.getListing(id);
  }

  @Post('listings')
  createListing(@Body() body: any) {
    return this.service.createListing(body);
  }

  @Put('listings/:id')
  updateListing(@Param('id') id: string, @Body() body: any) {
    return this.service.updateListing(id, body);
  }

  @Delete('listings/:id')
  deleteListing(@Param('id') id: string) {
    return this.service.deleteListing(id);
  }

  @Post('listings/:id/publish')
  publishListing(@Param('id') id: string) {
    return this.service.publishListing(id);
  }

  @Post('generate-content')
  generateListingContent(@Body() body: any) {
    return this.service.generateListingContent(body);
  }

  @Get('stats/:userId')
  getListingStats(@Param('userId') userId: string) {
    return this.service.getListingStats(userId);
  }
}
