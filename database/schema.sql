--Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

--Scam Cases table
CREATE TABLE IF NOT EXISTS scam_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT,
    platform VARCHAR(100),
    scam_date DATE,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id)
        REFERENCES categories(id)
);

--Images table
CREATE TABLE IF NOT EXISTS case_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,

    FOREIGN KEY (case_id)
        REFERENCES scam_cases(id)
        ON DELETE CASCADE
);

--Default scam categories
INSERT INTO categories (name)
VALUES
('Phishing'),
('Investment Scam'),
('Job Scam'),
('Love Scam'),
('Loan Scam'),
('Online Shopping Scam'),
('Social Media Scam'),
('Fake Buyer'),
('Others');