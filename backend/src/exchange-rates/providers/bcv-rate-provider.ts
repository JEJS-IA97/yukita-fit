import {
  HttpJsonRateProvider,
  type HttpJsonRateProviderOptions,
} from './http-json-rate-provider';

export {
  RateProviderError,
  type HttpFetch,
  type HttpFetchResponse,
} from './http-json-rate-provider';

export type BcvRateProviderOptions = Omit<
  HttpJsonRateProviderOptions,
  'rateType'
>;

export const BCV_DEFAULTS = {
  endpointUrl: 'https://ve.dolarapi.com/v1/dolares/oficial',
  source: 'DolarAPI (BCV)',
  valueField: 'promedio',
  dateField: 'fechaActualizacion',
} as const;

export class BcvRateProvider extends HttpJsonRateProvider {
  constructor(options: BcvRateProviderOptions) {
    super({ ...options, rateType: 'BCV' });
  }
}

export function createBcvProviderFromEnv(
  env: NodeJS.ProcessEnv,
): BcvRateProvider {
  return new BcvRateProvider({
    endpointUrl: env.BCV_RATE_URL || BCV_DEFAULTS.endpointUrl,
    source: env.BCV_RATE_SOURCE || BCV_DEFAULTS.source,
    valueField: env.BCV_RATE_FIELD || BCV_DEFAULTS.valueField,
    dateField: env.BCV_RATE_DATE_FIELD || BCV_DEFAULTS.dateField,
  });
}
