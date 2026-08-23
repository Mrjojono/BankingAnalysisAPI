import {
  DEFAULT_SMS_PIPELINE_CONFIG,
  normalizeSmsPipelineConfig,
  SMS_PIPELINE_CONFIG_KEY,
} from './config';

describe('normalizeSmsPipelineConfig', () => {
  it('null → défauts', () => {
    expect(normalizeSmsPipelineConfig(null)).toEqual(DEFAULT_SMS_PIPELINE_CONFIG);
  });

  it('JSON complet → valeurs conservées', () => {
    const cfg = normalizeSmsPipelineConfig(
      JSON.stringify({ regexEnabled: false, camenbertEnabled: false, camenbertThreshold: 0.8 }),
    );
    expect(cfg).toEqual({ regexEnabled: false, camenbertEnabled: false, camenbertThreshold: 0.8 });
  });

  it('JSON partiel → complété par les défauts', () => {
    const cfg = normalizeSmsPipelineConfig(JSON.stringify({ regexEnabled: false }));
    expect(cfg.regexEnabled).toBe(false);
    expect(cfg.camenbertEnabled).toBe(DEFAULT_SMS_PIPELINE_CONFIG.camenbertEnabled);
    expect(cfg.camenbertThreshold).toBe(DEFAULT_SMS_PIPELINE_CONFIG.camenbertThreshold);
  });

  it('JSON invalide → défauts', () => {
    expect(normalizeSmsPipelineConfig('pas du json')).toEqual(DEFAULT_SMS_PIPELINE_CONFIG);
  });

  it('clé Redis attendue', () => {
    expect(SMS_PIPELINE_CONFIG_KEY).toBe('sms_pipeline_config');
  });
});
