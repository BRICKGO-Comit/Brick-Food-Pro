import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.service';

@Injectable()
export class OrdersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(user: any) {
    const supabase = this.supabaseService.getClient();
    let query = supabase.from('orders').select('*, restaurant:restaurants(name), offer:offers(title, type, price_promo, price)');

    if (user.role === 'client') {
      query = query.eq('client_id', user.id);
    } else if (user.role === 'restaurant') {
      query = query.eq('restaurant_id', user.restaurant_id);
    } else if (user.role === 'agent') {
      query = query.eq('agent_id', user.id);
    }
    // Admin sees all

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string, user: any) {
    const supabase = this.supabaseService.getClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, restaurant:restaurants(*), offer:offers(*), client:profiles(*)')
      .eq('id', id)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');

    // Security check
    if (user.role === 'client' && order.client_id !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
    if (user.role === 'restaurant' && order.restaurant_id !== user.restaurant_id) {
      throw new ForbiddenException('Not authorized');
    }
    if (user.role === 'agent' && order.agent_id !== user.id) {
      throw new ForbiddenException('Not authorized');
    }

    // Fetch order history log
    const { data: history } = await supabase
      .from('order_history')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    return { ...order, history: history || [] };
  }

  async create(user: any, body: any) {
    const supabase = this.supabaseService.getClient();

    // 1. Fetch the offer to verify it is published and get price & commission details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', body.offer_id)
      .single();

    if (offerError || !offer) throw new BadRequestException('Offer not found');
    if (!offer.is_published) throw new BadRequestException('Offer is not active');

    // 2. Determine price and calculate total amount
    const price = offer.type === 'flash' ? offer.price_promo : offer.price;
    const quantity = body.quantity || 1;
    const totalAmount = Number(price) * quantity;
    const commissionAmount = totalAmount * (Number(offer.commission_rate) / 100);

    // 3. Generate a unique reservation alphanumeric code (e.g. BF-123456)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const prefix = offer.type === 'flash' ? 'BF' : 'BD';
    const reservationCode = `${prefix}${randomSuffix}`;

    // 4. Insert order
    // Postgres trigger trg_check_and_decrement_flash_stock will run BEFORE insert to verify & decrement flash stock
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: user.id,
        restaurant_id: offer.restaurant_id,
        offer_id: offer.id,
        agent_id: offer.agent_id,
        status: 'nouvelle',
        delivery_mode: body.delivery_mode || 'retrait',
        quantity,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        payment_status: 'paid', // clients pay always in advance
        payment_ref: body.payment_ref || 'WAVE_SIMULATED_SUCCESS',
        reservation_code: reservationCode,
      })
      .select()
      .single();

    if (orderError) {
      throw new BadRequestException(orderError.message);
    }

    // 5. Add initial history log
    await supabase.from('order_history').insert({
      order_id: order.id,
      action: 'creee',
      actor_id: user.id,
    });

    return order;
  }

  async updateStatus(id: string, status: string, user: any) {
    const supabase = this.supabaseService.getClient();
    
    // Fetch order first to confirm ownership
    const { data: order, error: getError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !order) throw new NotFoundException('Order not found');

    if (user.role === 'restaurant' && order.restaurant_id !== user.restaurant_id) {
      throw new ForbiddenException('Not authorized to update this order');
    }

    // Update status
    const { data, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw new BadRequestException(updateError.message);

    // Insert history audit trail
    await supabase.from('order_history').insert({
      order_id: id,
      action: status,
      actor_id: user.id,
    });

    return data;
  }

  async getDashboardStats(user: any) {
    const supabase = this.supabaseService.getClient();

    if (user.role === 'restaurant') {
      if (!user.restaurant_id) throw new BadRequestException('No restaurant linked to profile');
      
      // Get all orders for this restaurant
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', user.restaurant_id);

      if (error) throw new BadRequestException(error.message);

      // Compute statistics (aggregate calculations)
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.created_at.startsWith(today));
      const todayCA = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const activePreps = orders.filter(o => o.status === 'en_preparation').length;
      
      const statusCounts = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});

      return {
        ordersCountToday: todayOrders.length,
        caToday: todayCA,
        activePreparations: activePreps,
        statusCounts,
        recentOrders: orders.slice(0, 5),
      };

    } else if (user.role === 'agent') {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('agent_id', user.id);

      if (error) throw new BadRequestException(error.message);

      const totalCommissions = orders.reduce((sum, o) => sum + Number(o.commission_amount), 0);
      
      // Fetch restaurants count
      const { count: restoCount } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user.id);

      // Fetch pending proposals count
      const { count: pendingProposals } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user.id)
        .eq('status', 'en_attente');

      return {
        restaurantsCount: restoCount || 0,
        pendingProposalsCount: pendingProposals || 0,
        totalCommissions,
        ordersCount: orders.length,
        recentOrders: orders.slice(0, 5),
      };

    } else if (user.role === 'admin') {
      // Admin global statistics
      const { data: orders, error: ordersErr } = await supabase.from('orders').select('*');
      const { count: restoCount } = await supabase.from('restaurants').select('*', { count: 'exact', head: true });
      const { count: agentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent');
      const { count: clientCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');

      if (ordersErr) throw new BadRequestException(ordersErr.message);

      const totalCA = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const totalCommissions = orders.reduce((sum, o) => sum + Number(o.commission_amount), 0);

      return {
        totalRestaurants: restoCount || 0,
        totalAgents: agentCount || 0,
        totalClients: clientCount || 0,
        totalOrders: orders.length,
        totalCA,
        totalCommissions,
        recentOrders: orders.slice(0, 5),
      };
    }

    throw new ForbiddenException('Invalid role for statistics dashboard');
  }
}
