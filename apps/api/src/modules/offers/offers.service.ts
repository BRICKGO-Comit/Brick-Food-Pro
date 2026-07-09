import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.service';

@Injectable()
export class OffersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(user: any) {
    const supabase = this.supabaseService.getClient();
    let query = supabase.from('offers').select('*, restaurant:restaurants(name)');

    if (user.role === 'client') {
      // Clients only see published, active offers
      query = query.eq('is_published', true);
    } else if (user.role === 'agent') {
      // Agents only see their own proposals
      query = query.eq('agent_id', user.id);
    } else if (user.role === 'restaurant') {
      // Restaurants only see their own offers
      if (!user.restaurant_id) {
        throw new BadRequestException('User is not associated with any restaurant');
      }
      query = query.eq('restaurant_id', user.restaurant_id);
    }
    // Admins see all offers

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string, user: any) {
    const supabase = this.supabaseService.getClient();
    const { data: offer, error } = await supabase
      .from('offers')
      .select('*, restaurant:restaurants(*)')
      .eq('id', id)
      .single();

    if (error || !offer) throw new NotFoundException('Offer not found');

    // Security check
    if (user.role === 'client' && !offer.is_published) {
      throw new ForbiddenException('You are not authorized to view this offer');
    }
    if (user.role === 'agent' && offer.agent_id !== user.id) {
      throw new ForbiddenException('You are not authorized to view this offer');
    }
    if (user.role === 'restaurant' && offer.restaurant_id !== user.restaurant_id) {
      throw new ForbiddenException('You are not authorized to view this offer');
    }

    return offer;
  }

  async createProposal(user: any, body: any) {
    const supabase = this.supabaseService.getClient();
    
    // Set creator agent and initial status
    const proposal = {
      ...body,
      agent_id: user.id,
      status: 'en_attente',
      is_confirmed: false,
      // For flash deals, set quantity remaining to initial quantity
      quantity_remaining: body.type === 'flash' ? body.quantity_initial : null,
    };

    const { data, error } = await supabase
      .from('offers')
      .insert(proposal)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async validateProposal(id: string, body: any) {
    const supabase = this.supabaseService.getClient();
    
    // Admin can edit fields like price, quantity, commission before approving
    const updateData: any = {
      status: body.status, // 'validee', 'refusee', 'a_modifier'
      commission_rate: body.commission_rate,
    };

    if (body.price_promo !== undefined) updateData.price_promo = body.price_promo;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.quantity_initial !== undefined) {
      updateData.quantity_initial = body.quantity_initial;
      updateData.quantity_remaining = body.quantity_initial;
    }
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.start_timestamp !== undefined) updateData.start_timestamp = body.start_timestamp;
    if (body.end_timestamp !== undefined) updateData.end_timestamp = body.end_timestamp;

    const { data, error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // If validated, we could trigger a push notification to the restaurant here
    return data;
  }

  async confirmOffer(id: string, user: any) {
    const supabase = this.supabaseService.getClient();

    // Fetch offer to make sure it belongs to this restaurant
    const { data: offer, error: getError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !offer) throw new NotFoundException('Offer not found');
    if (offer.restaurant_id !== user.restaurant_id) {
      throw new ForbiddenException('This offer does not belong to your restaurant');
    }
    if (offer.status !== 'validee') {
      throw new BadRequestException('Offer must be validated by administration first');
    }

    // Set is_confirmed = true, which activates publishing due to is_published SQL generated column
    const { data, error } = await supabase
      .from('offers')
      .update({ is_confirmed: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
