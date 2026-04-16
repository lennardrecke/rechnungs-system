import { useLanguage } from '@/i18n/LanguageContext';
import type { Language } from '@/i18n/translations';
import { defaultConfig, useConfig } from '@/hooks/useConfig';
import type { AppConfig, AppConfigKey } from '@/hooks/useConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';

const SettingsPage = () => {
  const { t, language, setLanguage } = useLanguage();
  const { config, isLoading, updateConfig } = useConfig();
  const [draft, setDraft] = useState<Partial<AppConfig>>({});

  const baseConfig = useMemo(
    () => ({ ...defaultConfig, ...config, language: config.language || language }),
    [config, language]
  );
  const form = { ...baseConfig, ...draft };

  const set = (key: AppConfigKey, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const updates: Partial<AppConfig> = {};
    for (const key of Object.keys(form) as AppConfigKey[]) {
      if (form[key] !== baseConfig[key]) updates[key] = form[key];
    }
    if (Object.keys(updates).length > 0) {
      updateConfig.mutate(updates, {
        onSuccess: () => {
          setLanguage((form.language || 'de') as Language);
          setDraft({});
          toast.success(t('settings.saved'));
        },
        onError: (e: Error) => toast.error(e.message),
      });
    } else {
      setLanguage((form.language || 'de') as Language);
      toast.success(t('settings.saved'));
    }
  };

  if (isLoading) return <p>{t('general.loading')}</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">{t('settings.title')}</h2>

      <Card>
        <CardHeader><CardTitle>{t('settings.language')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={form.language || language} onValueChange={(v) => set('language', v)}>
            <SelectTrigger className='w-full'><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="de">{t('settings.german')}</SelectItem>
              <SelectItem value="ru">{t('settings.russian')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">{t('settings.currency')}</label>
              <Input value={form.currency || ''} onChange={(e) => set('currency', e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">{t('settings.taxRate')}</label>
              <Input type="number" value={form.tax_rate || ''} onChange={(e) => set('tax_rate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t('settings.billNameFormat')}</label>
            <Input value={form.bill_name_format || ''} onChange={(e) => set('bill_name_format', e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">{t('settings.billNameHelp')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('settings.companyInfo')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder={t('settings.companyName')} value={form.company_name || ''} onChange={(e) => set('company_name', e.target.value)} />
          <Input placeholder={t('settings.companyAddress')} value={form.company_address || ''} onChange={(e) => set('company_address', e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder={t('settings.companyZip')} value={form.company_zip || ''} onChange={(e) => set('company_zip', e.target.value)} />
            <Input placeholder={t('settings.companyCity')} value={form.company_city || ''} onChange={(e) => set('company_city', e.target.value)} />
          </div>
          <Input placeholder={t('settings.companyCountry')} value={form.company_country || ''} onChange={(e) => set('company_country', e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder={t('settings.companyEmail')} value={form.company_email || ''} onChange={(e) => set('company_email', e.target.value)} />
            <Input placeholder={t('settings.companyPhone')} value={form.company_phone || ''} onChange={(e) => set('company_phone', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateConfig.isPending}>{t('settings.save')}</Button>
    </div>
  );
};

export default SettingsPage;
