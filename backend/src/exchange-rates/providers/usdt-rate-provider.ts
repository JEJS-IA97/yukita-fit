import {
  HttpJsonRateProvider,
  type HttpJsonRateProviderOptions,
} from './http-json-rate-provider';

export {
  RateProviderError,
  type HttpFetch,
  type HttpFetchResponse,
} from './http-json-rate-provider';

export type UsdtRateProviderOptions = Omit<
  HttpJsonRateProviderOptions,
  'rateType'
>;

export const USDT_DEFAULTS = {
  endpointUrl: 'https://www.brecha-cambiaria.com/api/latest',
  source: 'Brecha-Cambiaria',
  valueField: 'usdt_avg',
  dateField: 'timestamp',
} as const;

export class UsdtRateProvider extends HttpJsonRateProvider {
  constructor(options: UsdtRateProviderOptions) {
    super({ ...options, rateType: 'USDT' });
  }
}

export function createUsdtProviderFromEnv(
  env: NodeJS.ProcessEnv,
): UsdtRateProvider {
  return new UsdtRateProvider({
    endpointUrl: env.USDT_RATE_URL || USDT_DEFAULTS.endpointUrl,
    source: env.USDT_RATE_SOURCE || USDT_DEFAULTS.source,
    valueField: env.USDT_RATE_FIELD || USDT_DEFAULTS.valueField,
    dateField: env.USDT_RATE_DATE_FIELD || USDT_DEFAULTS.dateField,
  });
}
