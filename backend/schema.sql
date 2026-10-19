CREATE TABLE IF NOT EXISTS clubs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          VARCHAR(120) NOT NULL,
  category      VARCHAR(60)  NOT NULL DEFAULT 'General',
  description   TEXT,
  president     VARCHAR(100),
  contact_email VARCHAR(120),
  meeting_day   VARCHAR(20),
  member_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS clubs_set_updated_at
AFTER UPDATE ON clubs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE clubs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;