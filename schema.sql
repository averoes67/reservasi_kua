DROP TABLE IF EXISTS queue_state;
DROP TABLE IF EXISTS reservations;

CREATE TABLE reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    reserve_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Menunggu',
    counter_number INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE queue_state (
    id INTEGER PRIMARY KEY,
    last_called_ticket TEXT,
    counter_number INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO queue_state (id, last_called_ticket, counter_number) VALUES (1, NULL, 1);