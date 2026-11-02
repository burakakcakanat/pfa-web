import { transferTotal } from '@/lib/transfer-pricing';
import { isLive, bundleComponents } from '@/lib/bundles';
import { WAITLIST_RATE_KEY } from '@/lib/waitlist';
import type { TransferQuote, CustomerTransfer } from '@/lib/purchase-inquiries';
import type { CurrencyPriceMap } from '@/lib/pricing';

export async function quoteTransfer(slug: string, kind: 'product' | 'bundle', lang: 'tr' | 'en', userId: string): Promise<TransferQuote> {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { loadBundle } = await import('@/lib/offers.server');
  const bundle = kind === 'bundle' ? await loadBundle(slug) : null;
  if (kind === 'bundle' && (!bundle || !isLive(bundle))) throw new Error('Paket şu anda satışa açık değil.');
  const components = bundle ? bundleComponents(bundle, lang).map(x=>x.slug) : [slug];
  const { data: products, error } = await db.from('products').select('id,slug,name_tr,active,activate_at,type,master_pdf_path,webinar_audience').in('slug',components);
  if(error) throw new Error('Ürün bilgileri okunamadı.');
  if (!products?.length || products.length !== new Set(components).size) throw new Error('Ürün bulunamadı.');
  const allowed = products.every(p=>isLive(p) && ['ebook','assessment','session','webinar'].includes(p.type) && p.slug !== 'pfa-pro-lisans-paketi' && p.webinar_audience !== 'practitioner');
  if (!allowed) throw new Error('Bu ürün doğrudan havale ile satışa açık değil.');
  let reason: string | null = null;
  for (const p of products) {
    if (p.type === 'ebook') {
      if (!p.master_pdf_path) reason = 'İmzalı kitap dosyası henüz hazır değil.';
      else { const {data:file,error:fileError}=await db.storage.from('book-files').download(p.master_pdf_path); if(fileError || !file) reason='İmzalı kitap dosyası henüz hazır değil.'; }
    }
    if(p.type==='webinar') {
      const {data:sessions}=await db.from('webinar_sessions').select('starts_at,join_url').eq('product_id',p.id).gte('starts_at',new Date().toISOString()).order('starts_at').limit(1);
      if(!sessions?.[0]?.join_url?.trim()) reason='Webinar tarihi ve katılım bilgileri hazırlanıyor; henüz havale yapmayın.';
    }
  }
  const {data:rows}=await db.from('product_prices').select('product_id,currency,price_cents').in('product_id',products.map(p=>p.id)).eq('active',true);
  const prices:CurrencyPriceMap={};
  for(const row of rows??[]){const product=products.find(p=>p.id===row.product_id); if(product && ['try','usd','eur'].includes(row.currency)) (prices[product.slug]??={})[row.currency as 'try'|'usd'|'eur']=row.price_cents;}
  const {data:waiting}=await db.from('book_waitlist').select('id').eq('user_id',userId).eq('product_slug',slug).neq('status','cancelled').order('created_at').limit(1).maybeSingle();
  const {data:rate}=await db.from('system_rates').select('value_numeric').eq('key',WAITLIST_RATE_KEY).maybeSingle();
  const total=transferTotal(prices,slug,bundle,lang,!!waiting,Number(rate?.value_numeric??10));
  if(!total) reason='Güncel TL fiyatı henüz hazır değil; ödeme yapmayın.';
  const {fetchBankTransferDetails}=await import('@/lib/purchase-inquiries.server');
  const bank=await fetchBankTransferDetails();
  if(!bank.iban || !bank.account_holder || !bank.bank_name || bank.currency.toUpperCase()!=='TRY') reason='Havale bilgileri hazırlanıyor; henüz ödeme yapmayın.';
  return {...(total??{subtotalCents:0,discountCents:0,totalCents:0,currency:'try' as const}),ready:!reason,reason,waitlistId:waiting?.id??null,label:bundle?.name_tr??products[0]?.name_tr??slug,components};
}

export async function customerTransfers(userId:string):Promise<CustomerTransfer[]> {
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const {data,error}=await db.from('purchase_inquiries').select('*').eq('user_id',userId).order('created_at',{ascending:false});
  if(error) throw new Error('Talepler yüklenemedi.');
  const {fetchBankTransferDetails}=await import('@/lib/purchase-inquiries.server'); const bank=await fetchBankTransferDetails();
  const {data:gifts}=await db.from('ebook_gifts').select('recipient_name,status,orders!inner(metadata)').eq('buyer_user_id',userId);
  const out:CustomerTransfer[]=[];
  for(const row of data??[]){
    let fresh=true;
    if(row.quote && !row.payment_reported_at && !['paid','fulfilled','closed'].includes(row.status)){
      try{const q=await quoteTransfer(row.fulfil_slug??row.product_slug,row.fulfil_kind==='bundle'?'bundle':'product',row.fulfil_book_lang==='en'?'en':'tr',userId);fresh=q.ready && q.totalCents===Math.round(Number(row.transfer_amount)*100);if(!fresh)row.quote={...q,reason:q.reason??'Ödeme öncesi güncel tutarı onaylayın.'} as never;}catch{fresh=false;}
    }
    const m=(row.metadata??{}) as Record<string,unknown>;
    const {admin_note: _note,ip_hash:_ip,fulfil_lock_until:_lock,...safe}=row;
    out.push({...safe,metadata:{is_gift:m.is_gift===true,recipient_name:typeof m.recipient_name==='string'?m.recipient_name:undefined,recipient_email:typeof m.recipient_email==='string'?m.recipient_email:undefined},bank:fresh && row.transfer_amount && !row.payment_reported_at && !['paid','fulfilled','closed'].includes(row.status)?bank:null,gifts:(gifts??[]).filter(g=>((g.orders as unknown as {metadata:Record<string,unknown>})?.metadata)?.inquiry_id===row.id).map(g=>({recipient_name:g.recipient_name,status:g.status}))} as unknown as CustomerTransfer);
  }
  return out;
}