import assert from 'node:assert/strict';
import { fresh,replayMigrations,asRole,denied,assertRls } from '../tests/helpers/supabase-postgres.mjs';

const db=await fresh();
try {
 const files=await replayMigrations(db);assert.ok(files.length>=30);
 await assertRls(db,22);
 for(const role of ['anon','authenticated']) {
  await denied(db,role,null,'select * from public.tawod_analytics_events');
  await denied(db,role,null,'select * from public.tawod_maintenance_customers');
  await denied(db,role,null,"select public.tawod_maintenance_save('save_request','{}','admin')");
 }
 await asRole(db,'service_role',null,"insert into public.tawod_analytics_events(event_name,visitor_id,session_id,page_path) values('page_view','synthetic-visitor','synthetic-session','/')");
 assert.equal((await asRole(db,'service_role',null,'select count(*)::int n from public.tawod_analytics_events')).rows[0].n,1);
 await denied(db,'service_role',null,'delete from public.tawod_analytics_events');
 const customer='30000000-0000-4000-8000-000000000001';
 await asRole(db,'service_role',null,"insert into public.tawod_maintenance_customers(id,name,phone) values($1,'Synthetic customer','+966500000001')",[customer]);
 await asRole(db,'service_role',null,"insert into public.tawod_maintenance_services(id,name,group_name,description,image_path) values('test-service','Synthetic service','test','Isolated test','/maintenance/assets/images/test.webp')");
 await asRole(db,'service_role',null,"select public.tawod_maintenance_save('save_request',$1::jsonb,'admin')",[JSON.stringify({customer_id:customer,contact_name:'Synthetic customer',services:['test-service'],property_type:'Office',district:'Riyadh',request_type:'one_off',status:'new',priority:'normal',source:'manual'})]);
 assert.equal((await asRole(db,'service_role',null,'select count(*)::int n from public.tawod_maintenance_requests')).rows[0].n,1);
 await asRole(db,'service_role',null,"update public.tawod_maintenance_customers set district='Test district' where id=$1",[customer]);
 await denied(db,'service_role',null,'delete from public.tawod_maintenance_customers');
 const beforeSubmit=(await db.query('select (select count(*)::int from public.tawod_maintenance_customers) customers,(select count(*)::int from public.tawod_maintenance_requests) requests,(select count(*)::int from public.tawod_maintenance_activity) activity')).rows[0];
 for(const actor of ['website','admin']) {
  await assert.rejects(()=>asRole(db,'service_role',null,"select public.tawod_maintenance_workspace('submit','{}',$1)",[actor]),e=>e.code==='0A000'&&e.message==='website_submission_not_enabled');
 }
 const afterSubmit=(await db.query('select (select count(*)::int from public.tawod_maintenance_customers) customers,(select count(*)::int from public.tawod_maintenance_requests) requests,(select count(*)::int from public.tawod_maintenance_activity) activity')).rows[0];
 assert.deepEqual(afterSubmit,beforeSubmit,'unsupported website submission must not create partial records');
 for(const role of ['anon','authenticated']) await denied(db,role,null,"select public.tawod_maintenance_workspace('submit','{}','website')");
 console.log(`Verified complete replay of ${files.length} migrations, 22 RLS-protected public tables, analytics INSERT/SELECT-only access, service maintenance RPC/CRUD, and browser denial.`);
} finally { await db.close(); }
