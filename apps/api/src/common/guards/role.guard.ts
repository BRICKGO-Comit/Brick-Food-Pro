import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const supabase = this.supabaseService.getClient();

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Get user profile from our public.profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found');
    }

    // Attach profile to request for use in controllers
    request.user = profile;

    // If no roles specified, allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Check role eligibility
    return requiredRoles.includes(profile.role);
  }
}
