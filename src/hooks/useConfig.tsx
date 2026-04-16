import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const defaultConfig = {
  language: 'de',
  currency: 'EUR',
  tax_rate: '19',
  bill_name_format: '{bill_number}_{customer_name}_{date}',
  company_name: '',
  company_address: '',
  company_zip: '',
  company_city: '',
  company_country: '',
  company_email: '',
  company_phone: '',
};

export type AppConfig = typeof defaultConfig;
export type AppConfigKey = keyof AppConfig;

export function useConfig() {
  const queryClient = useQueryClient();

  const { data: configMap = defaultConfig, isLoading } = useQuery<AppConfig>({
    queryKey: ['app_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_config').select('*');
      if (error) throw error;
      const map: AppConfig = { ...defaultConfig };
      data?.forEach((row) => {
        if (row.key in map) {
          map[row.key as AppConfigKey] = row.value;
        }
      });
      return map;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<AppConfig>) => {
      const entries = Object.entries(updates).map(([key, value]) => ({ key, value }));
      if (entries.length === 0) return;

      const { error } = await supabase
        .from('app_config')
        .upsert(entries, { onConflict: 'key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_config'] });
    },
  });

  return { config: configMap, isLoading, updateConfig };
}
