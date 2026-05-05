-- Add weight_italia to body_metrics
ALTER TABLE public.body_metrics ADD COLUMN IF NOT EXISTS weight_italia DECIMAL(5,2);
