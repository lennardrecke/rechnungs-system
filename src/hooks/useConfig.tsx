import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const defaultConfig: Record<string, string> = {
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

export function useConfig() {
  const queryClient = useQueryClient();

  const { data: configMap = {}, isLoading } = useQuery({
    queryKey: ['app_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_config').select('*');
      if (error) throw error;
      const map: Record<string, string> = { ...defaultConfig };
      data?.forEach((row) => { map[row.key] = row.value; });
      return map;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
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
