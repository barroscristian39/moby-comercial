-- Keep employee phone as a snapshot on the accident record so QIAT can be filled manually.
ALTER TABLE "accidents"
ADD COLUMN IF NOT EXISTS "employee_phone" TEXT;
