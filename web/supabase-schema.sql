-- ============================================
-- SUPABASE SCHEMA: Sports Ranking System
-- Run this in the Supabase SQL Editor
-- ============================================

-- Categories (e.g., Men's Physique, Bikini, Classic)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phase TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criteria weights per category
CREATE TABLE criteria_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  volume NUMERIC DEFAULT 4,
  condicao NUMERIC DEFAULT 3,
  proporcao NUMERIC DEFAULT 2,
  simetria NUMERIC DEFAULT 2,
  estetica NUMERIC DEFAULT 1,
  pose NUMERIC DEFAULT 2,
  UNIQUE(category_id)
);

-- Athletes
CREATE TABLE athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, number)
);

-- Judges
CREATE TABLE judges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Current call (which athletes are being scored right now)
CREATE TABLE current_call (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  UNIQUE(category_id, athlete_id)
);

-- Judge scores: one row per judge per athlete per criteria pose
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  -- Volume
  volume_frente NUMERIC,
  volume_lado NUMERIC,
  volume_costas NUMERIC,
  -- Condicao (single score)
  condicao NUMERIC,
  -- Proporcao
  proporcao_frente NUMERIC,
  proporcao_lado NUMERIC,
  proporcao_costas NUMERIC,
  -- Simetria
  simetria_frente NUMERIC,
  simetria_lado NUMERIC,
  simetria_costas NUMERIC,
  -- Estetica
  estetica_frente NUMERIC,
  estetica_lado NUMERIC,
  estetica_costas NUMERIC,
  -- Pose
  pose_frente NUMERIC,
  pose_lado NUMERIC,
  pose_costas NUMERIC,
  --
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, judge_id, athlete_id)
);

-- Saved ranking results (history)
CREATE TABLE ranking_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  athlete_number INTEGER NOT NULL,
  athlete_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  total_score NUMERIC NOT NULL DEFAULT 0,
  breakdown JSONB DEFAULT '{}',
  saved_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (open for now, tighten later)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_call ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;

-- Allow all access (anon key) - adjust for production
CREATE POLICY "Allow all" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON criteria_weights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON athletes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON judges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON current_call FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON ranking_history FOR ALL USING (true) WITH CHECK (true);

-- Auto-create weights when a category is created
CREATE OR REPLACE FUNCTION create_default_weights()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO criteria_weights (category_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_weights
  AFTER INSERT ON categories
  FOR EACH ROW
  EXECUTE FUNCTION create_default_weights();
