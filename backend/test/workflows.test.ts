import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { postgres, closeServices } from '../src/lib/services.js';
test('demo booking, rescheduling, attachments, check-in and completion',async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/v1`;
 const slots=[randomUUID(),randomUUID()];const visits:string[]=[];
 async function call(path:string,role:string,body?:object,version?:number){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Demo-Role':role,'Idempotency-Key':randomUUID(),...(version?{'If-Match':String(version)}:{})},...(body?{body:JSON.stringify(body)}:{})});const b=await r.json() as any;assert.ok(r.ok,JSON.stringify(b));return b;}
 try{
 for(let i=0;i<2;i++)await postgres.query(`INSERT INTO booking.slots(id,tenant_id,doctor_id,starts_at,ends_at) VALUES($1,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now()+$2::interval,now()+$2::interval+interval '30 minutes')`,[slots[i],`${i*2+1} hours`]);
 let a=await call('/appointment-requests','patient',{slotId:slots[0],patientName:'Aarav'});visits.push(a.id);assert.equal(a.status,'pending');a=await call(`/requests/${a.id}/confirm`,'hospital',{},a.version);assert.ok(a.pass_token);
 await call(`/visits/${a.id}/reschedule`,'patient',{slotId:slots[1]},a.version);assert.equal((await call(`/visits/${a.id}`,'patient')).status,'confirmed');
 let b=(await call('/workspace','hospital')).visits.find((v:any)=>v.previous_id===a.id);assert.ok(b);visits.push(b.id);b=await call(`/requests/${b.id}/confirm`,'hospital',{},b.version);assert.equal((await call(`/visits/${a.id}`,'patient')).status,'cancelled');
 await call(`/visits/${b.id}/files`,'patient',{name:'test.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.4\nDemo file').toString('base64')},b.version);
 b=await call(`/visits/${b.id}`,'doctor');assert.equal(b.files.length,1);
 assert.equal((await call('/scan','hospital',{token:b.pass_token})).alreadyCheckedIn,false);assert.equal((await call('/scan','hospital',{token:b.pass_token})).alreadyCheckedIn,true);
 b=await call(`/visits/${b.id}`,'doctor');b=await call(`/visits/${b.id}/complete`,'doctor',{notes:'Completed',prescription:'Follow up'},b.version);assert.equal(b.status,'completed');assert.equal(b.pass_token,null);
 }finally{
 const db=await postgres.connect();try{await db.query('BEGIN');await db.query("SELECT set_config('app.user_id','demo-hospital',true)");await db.query('DELETE FROM booking.files WHERE appointment_id=ANY($1::uuid[])',[visits]);await db.query('DELETE FROM booking.outbox WHERE appointment_id=ANY($1::uuid[])',[visits]);await db.query('DELETE FROM booking.appointments WHERE id=ANY($1::uuid[])',[visits]);await db.query('DELETE FROM booking.slots WHERE id=ANY($1::uuid[])',[slots]);await db.query('COMMIT');}finally{db.release();await new Promise<void>(r=>server.close(()=>r()));await closeServices();}
 }
});
