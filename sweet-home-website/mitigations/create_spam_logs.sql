-- Create spam_logs table for analysis and improvement
CREATE TABLE IF NOT EXISTS spam_logs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(30),
  message TEXT,
  score INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for analysis
CREATE INDEX IF NOT EXISTS idx_spam_logs_score ON spam_logs(score);
CREATE INDEX IF NOT EXISTS idx_spam_logs_created_at ON spam_logs(created_at);
