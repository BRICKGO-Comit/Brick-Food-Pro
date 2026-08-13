import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment/wave')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  async checkout(@Body() body: { amount: string; orderId: string; success_url: string; error_url: string }) {
    const { amount, orderId, success_url, error_url } = body;
    const session = await this.paymentService.createCheckoutSession(amount, orderId, success_url, error_url);
    // Return session data directly to match Wave API structure
    return session;
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: any, @Req() req: any) {
    // Note: Webhook signature validation should be implemented here in production.
    console.log('Received Wave webhook event:', body);
    return { received: true };
  }
}
