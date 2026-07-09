import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { SupabaseService } from '../../common/supabase.service';

@Module({
  controllers: [RestaurantsController],
  providers: [RestaurantsService, SupabaseService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
