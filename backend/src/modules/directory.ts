import { Router } from 'express';
import { z } from 'zod';

import { postgres } from '../lib/services.js';
export const directory=Router();
const hospitalSelect=`SELECT c.*,
 COALESCE((SELECT json_agg(json_build_object('id',p.id,'path','/v1/hospitals/'||c.id||'/photos/'||p.id) ORDER BY p.created_at) FROM booking.hospital_photos p WHERE p.tenant_id=c.id),'[]'::json) photos,
 count(DISTINCT d.id)::int doctor_count, min(d.fee) min_fee,
 array_remove(array_agg(DISTINCT d.specialty),NULL) specialties
 FROM booking.clinics c LEFT JOIN booking.doctors d ON d.tenant_id=c.id AND d.active`;
directory.get('/hospitals',async(req,res)=>{
 const q=z.string().max(100).parse(req.query.q??'');
 const {rows}=await postgres.query(`${hospitalSelect} WHERE concat_ws(' ',c.name,c.city,c.address) ILIKE $1 OR EXISTS(SELECT 1 FROM booking.doctors sd WHERE sd.tenant_id=c.id AND sd.active AND sd.specialty ILIKE $1) GROUP BY c.id ORDER BY c.name LIMIT 100`,[`%${q}%`]);
 res.json(rows);
});
directory.get('/hospitals/:id',async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 const hospital=(await postgres.query(`${hospitalSelect} WHERE c.id=$1 GROUP BY c.id`,[id])).rows[0];
 if(!hospital){res.status(404).json({code:'NOT_FOUND'});return;}
 const doctors=(await postgres.query(`SELECT d.*,c.name clinic_name,c.city,c.timezone FROM booking.doctors d JOIN booking.clinics c ON c.id=d.tenant_id WHERE d.tenant_id=$1 AND d.active ORDER BY d.name`,[id])).rows;
 res.json({hospital,doctors});
});

directory.get('/hospitals/:id/photos/:photoId',async(req,res)=>{
 const tenant=z.string().uuid().parse(req.params.id);const photoId=z.string().uuid().parse(req.params.photoId);
 const photo=(await postgres.query('SELECT mime,content FROM booking.hospital_photos WHERE id=$1 AND tenant_id=$2',[photoId,tenant])).rows[0];
 if(!photo){res.status(404).json({code:'NOT_FOUND'});return;}
 res.setHeader('Cache-Control','public, max-age=86400');res.type(photo.mime).send(photo.content);
});
