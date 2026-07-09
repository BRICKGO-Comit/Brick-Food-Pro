import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('restaurants')
@UseGuards(RoleGuard)
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'agent')
  async create(@Body() body: any) {
    return this.restaurantsService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'agent', 'restaurant')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.restaurantsService.update(id, body);
  }
}
