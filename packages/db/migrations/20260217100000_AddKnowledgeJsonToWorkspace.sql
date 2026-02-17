-- Add knowledgeJson JSONB column to workspace table for the Knowledge Hub
ALTER TABLE "workspace" ADD COLUMN "knowledgeJson" jsonb;
