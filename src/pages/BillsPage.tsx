import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const BillsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, bill_items(*)')
        .order('bill_number', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success(t('general.success'));
    },
  });

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: t('bills.draft'), sent: t('bills.sent'), paid: t('bills.paid'), cancelled: t('bills.cancelled') };
    return map[s] || s;
  };

  const calcTotal = (items: { quantity: number; unit_price: number }[]) =>
    items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t('bills.title')}</h2>
        <Button onClick={() => navigate('/bills/new')}><Plus size={16} className="mr-1" /> {t('bills.create')}</Button>
      </div>

      {isLoading ? <p>{t('general.loading')}</p> : bills.length === 0 ? (
        <p className="text-muted-foreground">{t('bills.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bills.number')}</TableHead>
              <TableHead>{t('bills.customer')}</TableHead>
              <TableHead>{t('bills.date')}</TableHead>
              <TableHead>{t('bills.status')}</TableHead>
              <TableHead className="text-right">{t('bills.total')}</TableHead>
              <TableHead className="w-28">{t('general.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">#{b.bill_number}</TableCell>
                <TableCell>{b.customer_name}</TableCell>
                <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge className={statusColors[b.status] || ''}>{statusLabel(b.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">{calcTotal(b.bill_items).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/bills/${b.id}`)}><Eye size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm(t('bills.confirmDelete'))) remove.mutate(b.id);
                    }}><Trash2 size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default BillsPage;
