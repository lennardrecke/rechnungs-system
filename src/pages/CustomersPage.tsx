import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface CustomerForm {
  name: string; company: string; address: string; city: string; zip: string; country: string; email: string; phone: string; notes: string;
}
const emptyForm: CustomerForm = { name: '', company: '', address: '', city: '', zip: '', country: '', email: '', phone: '', notes: '' };

const CustomersPage = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, company: form.company || null, address: form.address || null,
        city: form.city || null, zip: form.zip || null, country: form.country || null,
        email: form.email || null, phone: form.phone || null, notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
      toast.success(t('general.success'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const openEdit = (c: typeof customers[0]) => {
    setForm({
      name: c.name, company: c.company || '', address: c.address || '', city: c.city || '',
      zip: c.zip || '', country: c.country || '', email: c.email || '', phone: c.phone || '', notes: c.notes || '',
    });
    setEditId(c.id);
    setOpen(true);
  };

  const set = (key: keyof CustomerForm, val: string) => setForm({ ...form, [key]: val });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t('customers.title')}</h2>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> {t('customers.add')}</Button>
      </div>

      {isLoading ? <p>{t('general.loading')}</p> : customers.length === 0 ? (
        <p className="text-muted-foreground">{t('customers.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('customers.name')}</TableHead>
              <TableHead>{t('customers.company')}</TableHead>
              <TableHead>{t('customers.email')}</TableHead>
              <TableHead>{t('customers.phone')}</TableHead>
              <TableHead className="w-24">{t('general.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.company}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('customers.confirmDelete'))) remove.mutate(c.id); }}><Trash2 size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? t('customers.edit') : t('customers.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t('customers.name')} value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Input placeholder={t('customers.company')} value={form.company} onChange={(e) => set('company', e.target.value)} />
            <Input placeholder={t('customers.address')} value={form.address} onChange={(e) => set('address', e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder={t('customers.zip')} value={form.zip} onChange={(e) => set('zip', e.target.value)} />
              <Input placeholder={t('customers.city')} value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <Input placeholder={t('customers.country')} value={form.country} onChange={(e) => set('country', e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder={t('customers.email')} value={form.email} onChange={(e) => set('email', e.target.value)} />
              <Input placeholder={t('customers.phone')} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <Textarea placeholder={t('customers.notes')} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('customers.cancel')}</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name}>{t('products.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;

