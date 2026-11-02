import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
import {validReceipt} from '@/lib/transfer-pricing';

const selection=z.object({slug:z.string().min(1).max(120),kind:z.enum(['product','bundle']),lang:z.enum(['tr','en'])});
export const getTransferQuote=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>selection.parse(d)).handler(async({data,context})=>{const {quoteTransfer}=await import('@/lib/transfer.server');return quoteTransfer(data.slug,data.kind,data.lang,context.userId);});
export const listMyTransfers=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{const {customerTransfers}=await import('@/lib/transfer.server');return customerTransfers(context.userId);});
export const reportTransfer=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>z.object({id:z.string().uuid(),path:z.string().max(500)}).parse(d)).handler(async({data,context})=>{
  const {data:inq}=await context.supabase.from('purchase_inquiries').select('id,status,transfer_amount,user_id,payment_reported_at,quote,fulfil_kind,fulfil_slug,fulfil_book_lang,product_slug').eq('id',data.id).eq('user_id',context.userId).maybeSingle();
  if(!inq || !inq.transfer_amount || !['new','contacted'].includes(inq.status)) throw new Error('Bu talep için ödeme bildirimi yapılamaz.');
  if(!data.path.startsWith(`${context.userId}/${data.id}/`)) throw new Error('Dekont dosyası bu talebe ait değil.');
  const {data:file,error}=await context.supabase.storage.from('transfer-receipts').download(data.path);
  if(error || !file || !validReceipt(file.size,file.type)) throw new Error('Dekont PDF, PNG veya JPEG ve en fazla 5 MB olmalı.');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const {error:recErr}=await db.from('transfer_receipts').upsert({inquiry_id:inq.id,user_id:context.userId,path:data.path},{onConflict:'path'});if(recErr) throw new Error('Dekont kaydedilemedi.');
  const {error:upErr}=await db.from('purchase_inquiries').update({receipt_path:data.path,payment_reported_at:new Date().toISOString()}).eq('id',inq.id).in('status',['new','contacted']);if(upErr) throw new Error('Ödeme bildirimi kaydedilemedi.');return {ok:true};
});
export const receiptUrl=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>z.object({id:z.string().uuid()}).parse(d)).handler(async({data,context})=>{
  const {data:inq}=await context.supabase.from('purchase_inquiries').select('user_id,receipt_path').eq('id',data.id).maybeSingle();if(!inq?.receipt_path) throw new Error('Dekont bulunamadı.');
  if(inq.user_id!==context.userId){const {assertPurchaseAdmin}=await import('@/lib/purchase-inquiries.server');await assertPurchaseAdmin(context.supabase,context.userId);}
  const {data:url,error}=await context.supabase.storage.from('transfer-receipts').createSignedUrl(inq.receipt_path,120);if(error || !url) throw new Error('Dekont açılamadı.');return url.signedUrl;
});