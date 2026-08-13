import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PaymentService {
  private readonly waveApiUrl = 'https://api.wave.com/v1/checkout/sessions';

  async createCheckoutSession(amount: string, orderId: string, success_url: string, error_url: string): Promise<any> {
    const waveSecretKey = process.env.WAVE_SECRET_KEY;
    if (!waveSecretKey) {
      throw new InternalServerErrorException('WAVE_SECRET_KEY is not defined');
    }

    try {
      const response = await axios.post(
        this.waveApiUrl,
        {
          amount,
          currency: 'XOF',
          client_reference: orderId,
          error_url: error_url,
          success_url: success_url,
        },
        {
          headers: {
            Authorization: `Bearer ${waveSecretKey}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error('Error creating Wave checkout session', error.response?.data || error.message);
      throw new InternalServerErrorException('Payment processing failed');
    }
  }
}
