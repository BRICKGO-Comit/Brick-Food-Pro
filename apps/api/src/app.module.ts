import { Module } from '@nestjs/common';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { OffersModule } from './modules/offers/offers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SupabaseService } from './common/supabase.service';

@Module({
  imports: [RestaurantsModule, OffersModule, OrdersModule],
  controllers: [],
  providers: [SupabaseService],
})
export class AppModule {}
