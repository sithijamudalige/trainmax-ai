-- Create Chat Memory Tables for Players and Coaches
-- Run this in your Supabase SQL Editor

-- 1. Player Chat Memory
CREATE TABLE IF NOT EXISTS public.chat_memory_players (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    history JSONB DEFAULT '[]'::jsonb,
    key_facts JSONB DEFAULT '[]'::jsonb,
    goals JSONB DEFAULT '[]'::jsonb,
    injuries JSONB DEFAULT '[]'::jsonb,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    last_topics JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for players
ALTER TABLE public.chat_memory_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat memory"
    ON public.chat_memory_players
    FOR ALL
    USING (auth.uid() = user_id);

-- 2. Coach Chat Memory
CREATE TABLE IF NOT EXISTS public.chat_memory_coaches (
    coach_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    history JSONB DEFAULT '[]'::jsonb,
    key_insights JSONB DEFAULT '[]'::jsonb,
    focus_areas JSONB DEFAULT '[]'::jsonb,
    context_teams JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for coaches
ALTER TABLE public.chat_memory_coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own chat memory"
    ON public.chat_memory_coaches
    FOR ALL
    USING (auth.uid() = coach_id);
