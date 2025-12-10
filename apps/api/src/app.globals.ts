import type { OffcutsService } from './offcuts/offcuts.service';
import type { SalesChannelsConnectionsService } from './sales-channels/sales-channels.connections.service';

export const AppGlobals = {
  offcutsService: null as OffcutsService | null,
  salesChannelsConnectionsService: null as SalesChannelsConnectionsService | null,
};
