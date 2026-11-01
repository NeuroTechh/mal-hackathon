BEGIN;
SELECT set_config('app.user_id','demo-patient',true);
UPDATE "user" SET name='Manan Gandhi',"updatedAt"=now() WHERE id='demo-patient' AND name<>'Manan Gandhi';
UPDATE booking.profiles SET name='Manan Gandhi' WHERE user_id='demo-patient' AND (relationship='Self' OR name='Aarav Sharma') AND name<>'Manan Gandhi';
UPDATE booking.appointments SET patient_name='Manan Gandhi' WHERE user_id='demo-patient' AND patient_name='Aarav Sharma';
INSERT INTO booking.profiles(user_id,name,relationship) SELECT 'demo-patient','Meghna Gandhi','Family' WHERE NOT EXISTS(SELECT 1 FROM booking.profiles WHERE user_id='demo-patient' AND lower(name)='meghna gandhi');
INSERT INTO booking.profiles(user_id,name,relationship) SELECT 'demo-patient','Jigam Gandhi','Family' WHERE NOT EXISTS(SELECT 1 FROM booking.profiles WHERE user_id='demo-patient' AND lower(name)='jigam gandhi');
COMMIT;
