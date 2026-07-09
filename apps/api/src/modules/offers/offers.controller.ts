import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OffersService } from './offers.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('offers')
@UseGuards(RoleGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.offersService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.offersService.findOne(id, req.user);
  }

  @Post()
  @Roles('agent')
  async createProposal(@Req() req: any, @Body() body: any) {
    return this.offersService.createProposal(req.user, body);
  }

  @Patch(':id/validate')
  @Roles('admin')
  async validateProposal(@Param('id') id: string, @Body() body: any) {
    return this.offersService.validateProposal(id, body);
  }

  @Patch(':id/confirm')
  @Roles('restaurant')
  async confirmOffer(@Param('id') id: string, @Req() req: any) {
    return this.offersService.confirmOffer(id, req.user);
  }
}
