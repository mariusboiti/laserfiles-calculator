import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
        headers.Authorization = `Bearer ${apiKey}`;
        headers['x-api-key'] = apiKey;
        headers['x-laserfiles-api-key'] = apiKey;
      }

      this.logger.log(
        `WP SSO exchange request: url=${url} hasApiKey=${Boolean(apiKey)}`,
      );

      const response = await axios.post<WpExchangeResponse>(
        url,
        { code },
        {
          headers,
          timeout: 10_000,
          validateStatus: () => true,
        },
      );

      const status = response.status;
      const responseData = response.data as any;
      const responseText = (() => {
        try {
          const raw =
            typeof responseData === 'string'
              ? responseData
              : JSON.stringify(responseData);
          return raw.length > 500 ? `${raw.slice(0, 500)}...` : raw;
        } catch {
          return '[unserializable]';
        }
      })();

      if (status < 200 || status >= 300) {
        this.logger.warn(
          `WP SSO exchange non-2xx: url=${url} status=${status} body=${responseText}`,
        );

        if (status === 401 || status === 403) {
          throw new UnauthorizedException(
            `WP SSO exchange rejected (status=${status})`,
          );
        }
        if (status === 400) {
          throw new BadRequestException(
            `WP SSO exchange invalid request (status=${status})`,
          );
        }
        throw new BadGatewayException(
          `WP SSO exchange upstream error (status=${status})`,
        );
      }

      const data = response.data;

      if (!data?.wpUserId || !data?.email) {
        this.logger.warn(
          `WP SSO exchange invalid payload: url=${url} status=${status} body=${responseText}`,
        );
        throw new UnauthorizedException(
          `Invalid WP exchange response (status=${status})`,
        );
      }

      return data;
    } catch (e: any) {
      // If we already produced a Nest exception (Unauthorized/BadRequest/BadGateway/etc.),
      // do not wrap it again. Some runtime setups can make instanceof checks unreliable,
      // so prefer duck-typing.
      if (e && typeof e.getStatus === 'function' && typeof e.getResponse === 'function') {
        throw e;
      }

      const status = e?.response?.status;
      const responseData = e?.response?.data;
      const message = e?.message;
      const responseText = (() => {
        try {
          const raw =
            typeof responseData === 'string'
              ? responseData
              : JSON.stringify(responseData);
          return raw.length > 500 ? `${raw.slice(0, 500)}...` : raw;
        } catch {
          return '[unserializable]';
        }
      })();

      this.logger.error(
        `WP SSO exchange request failed: url=${url} status=${status ?? 'n/a'} message=${
          message ?? 'n/a'
        } body=${responseText}`,
      );

      throw new BadGatewayException(
        `WP SSO exchange upstream failure (status=${status ?? 'n/a'})`,
      );
    }
  }
}
