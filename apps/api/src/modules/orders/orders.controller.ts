import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('orders')
@UseGuards(RoleGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.ordersService.findAll(req.user);
  }

  @Get('stats')
  async getDashboardStats(@Req() req: any) {
    return this.ordersService.getDashboardStats(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.findOne(id, req.user);
  }

  @Post()
  @Roles('client', 'admin')
  async create(@Req() req: any, @Body() body: any) {
    return this.ordersService.create(req.user, body);
  }

  @Patch(':id/status')
  @Roles('restaurant', 'admin')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.ordersService.updateStatus(id, status, req.user);
  }
}
