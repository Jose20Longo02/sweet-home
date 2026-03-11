-- Migration: Add full_address column to properties
-- Full address: Street, Number, Apartment, etc.

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS full_address TEXT;
