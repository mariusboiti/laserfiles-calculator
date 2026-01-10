import { BadGatewayException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
  private readonly logger = new Logger(WpSsoExchangeService.name);

  async exchangeCode(code: string): Promise<WpExchangeResponse> {
    const baseUrl = process.env.WP_PLUGIN_BASE_URL;
    const apiKey = process.env.WP_PLUGIN_API_KEY;

    if (!baseUrl) {
      this.logger.warn('WP exchange requested but WP_PLUGIN_BASE_URL not configured');
      throw new UnauthorizedException('WP integration not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/wp-json/laserfiles/v1/sso/exchange`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['x-laserfiles-api-key'] = apiKey;
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const { data } = await axios.post<WpExchangeResponse>(
        url,
        { code },
        {
          headers,
          timeout: 10_000,
        },
      );

      if (!data?.wpUserId || !data?.email) {
        throw new UnauthorizedException('Invalid WP exchange response');
      }

      return data;
    } catch (e: any) {
      const status = e?.response?.status;
      const responseData = e?.response?.data;
      const message = e?.message;

      this.logger.warn(
        `WP exchange failed: status=${status ?? 'n/a'} message=${message ?? 'n/a'} data=${
          responseData ? JSON.stringify(responseData) : 'n/a'
        }`,
      );

      if (status === 401 || status === 400) {
        throw new UnauthorizedException('Invalid or expired SSO code');
      }

      throw new BadGatewayException('WP SSO exchange upstream failure');
    }
  }
}
