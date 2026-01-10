import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

type WpExchangeResponse = {
  wpUserId: number | string;
  email: string;
  displayName?: string;
  name?: string;
  entitlements?: any;
};

@Injectable()
export class WpSsoExchangeService {
  async exchangeCode(code: string): Promise<WpExchangeResponse> {
    const baseUrl = process.env.WP_PLUGIN_BASE_URL;
    const apiKey = process.env.WP_PLUGIN_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new UnauthorizedException('WP integration not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/wp-json/laserfiles/v1/sso/exchange`;

    try {
      const { data } = await axios.post<WpExchangeResponse>(
        url,
        { code },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-laserfiles-api-key': apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10_000,
        },
      );

      if (!data?.wpUserId || !data?.email) {
        throw new UnauthorizedException('Invalid WP exchange response');
      }

      return data;
    } catch (_e: any) {
      throw new UnauthorizedException('Invalid or expired SSO code');
    }
  }
}
