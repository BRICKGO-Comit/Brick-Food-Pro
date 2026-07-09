import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.service';

@Injectable()
export class RestaurantsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name');
    
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async create(body: any) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('restaurants')
      .insert(body)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, body: any) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('restaurants')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
