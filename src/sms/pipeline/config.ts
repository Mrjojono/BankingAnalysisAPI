export interface SmsPipelineConfig {
  regexEnabled: boolean;
  camenbertEnabled: boolean;
  camenbertThreshold: number;
}

export const SMS_PIPELINE_CONFIG_KEY = 'sms_pipeline_config';

export const DEFAULT_SMS_PIPELINE_CONFIG: SmsPipelineConfig = {
  regexEnabled: true,
  camenbertEnabled: true,
  camenbertThreshold: 0.75,
};

export function normalizeSmsPipelineConfig(raw: string | null): SmsPipelineConfig {
  if (!raw) return { ...DEFAULT_SMS_PIPELINE_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    return {
      regexEnabled:
        typeof parsed.regexEnabled === 'boolean'
          ? parsed.regexEnabled
          : DEFAULT_SMS_PIPELINE_CONFIG.regexEnabled,
      camenbertEnabled:
        typeof parsed.camenbertEnabled === 'boolean'
          ? parsed.camenbertEnabled
          : DEFAULT_SMS_PIPELINE_CONFIG.camenbertEnabled,
      camenbertThreshold:
        typeof parsed.camenbertThreshold === 'number' &&
        parsed.camenbertThreshold >= 0 &&
        parsed.camenbertThreshold <= 1
          ? parsed.camenbertThreshold
          : DEFAULT_SMS_PIPELINE_CONFIG.camenbertThreshold,
    };
  } catch {
    return { ...DEFAULT_SMS_PIPELINE_CONFIG };
  }
}
