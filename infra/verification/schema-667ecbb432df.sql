-- Empty schema fixture for migration rehearsal; based on 667ecbb432df.
CREATE TABLE users (
	id UUID NOT NULL,
	email VARCHAR(255) NOT NULL,
	hashed_password VARCHAR(255) NOT NULL,
	is_active BOOLEAN NOT NULL,
	role VARCHAR(20) NOT NULL,
	auth_provider VARCHAR(20) NOT NULL,
	is_pro BOOLEAN NOT NULL,
	pro_expires_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT check_user_role CHECK (role IN ('admin', 'participant')),
	CONSTRAINT check_auth_provider CHECK (auth_provider IN ('local', 'google'))
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE packages (
	id UUID NOT NULL,
	title VARCHAR(255) NOT NULL,
	description TEXT NOT NULL,
	price INTEGER NOT NULL,
	is_premium BOOLEAN NOT NULL,
	category VARCHAR(50) NOT NULL,
	is_published BOOLEAN NOT NULL,
	is_weekly BOOLEAN NOT NULL,
	is_active BOOLEAN NOT NULL,
	start_at TIMESTAMP WITH TIME ZONE,
	end_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (id)
);

CREATE INDEX ix_package_category ON packages (category);

CREATE INDEX ix_package_published_active ON packages (is_published, is_active);

CREATE TABLE user_profiles (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	full_name VARCHAR(255) NOT NULL,
	phone_number VARCHAR(20),
	target_instansi VARCHAR(255),
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX ix_user_profiles_user_id ON user_profiles (user_id);

CREATE TABLE questions (
	id UUID NOT NULL,
	package_id UUID NOT NULL,
	content TEXT NOT NULL,
	image_url VARCHAR(500),
	discussion TEXT,
	segment VARCHAR(50) NOT NULL,
	sub_category VARCHAR(100),
	number INTEGER NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_package_question_number UNIQUE (package_id, number),
	CONSTRAINT check_question_segment CHECK (segment IN ('TWK', 'TIU', 'TKP')),
	FOREIGN KEY(package_id) REFERENCES packages (id)
);

CREATE TABLE exam_sessions (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	package_id UUID NOT NULL,
	start_time TIMESTAMP WITH TIME ZONE NOT NULL,
	end_time TIMESTAMP WITH TIME ZONE,
	total_score INTEGER NOT NULL,
	score_twk INTEGER NOT NULL,
	score_tiu INTEGER NOT NULL,
	score_tkp INTEGER NOT NULL,
	status VARCHAR(20) NOT NULL,
	is_preview BOOLEAN NOT NULL,
	is_passed BOOLEAN NOT NULL,
	ai_analysis JSON,
	ai_status VARCHAR(20) NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(package_id) REFERENCES packages (id)
);

CREATE INDEX ix_exam_sessions_user_id ON exam_sessions (user_id);

CREATE INDEX ix_exam_session_user_package ON exam_sessions (user_id, package_id);

CREATE INDEX ix_exam_sessions_package_id ON exam_sessions (package_id);

CREATE INDEX ix_exam_session_user_status ON exam_sessions (user_id, status);

CREATE INDEX ix_exam_sessions_status ON exam_sessions (status);

CREATE TABLE user_transactions (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	package_id UUID,
	transaction_type VARCHAR(50) NOT NULL,
	order_id VARCHAR(100),
	payment_status VARCHAR(20) NOT NULL,
	amount INTEGER NOT NULL,
	payment_url VARCHAR(255),
	message TEXT,
	is_anonymous BOOLEAN NOT NULL,
	access_expires_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	PRIMARY KEY (id),
	CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'success', 'failed')),
	CONSTRAINT check_transaction_type CHECK (transaction_type IN ('pro_upgrade', 'donation')),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(package_id) REFERENCES packages (id)
);

CREATE UNIQUE INDEX ix_user_transactions_order_id ON user_transactions (order_id);

CREATE INDEX ix_user_transactions_package_id ON user_transactions (package_id);

CREATE INDEX ix_user_transactions_user_id ON user_transactions (user_id);

CREATE INDEX ix_user_transactions_payment_status ON user_transactions (payment_status);

CREATE TABLE feedbacks (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	category VARCHAR(50) NOT NULL,
	content TEXT NOT NULL,
	status VARCHAR(20) NOT NULL,
	priority VARCHAR(10) NOT NULL,
	admin_notes TEXT,
	path_context VARCHAR(255),
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT check_feedback_status CHECK (status IN ('pending', 'reviewed', 'in_progress', 'resolved')),
	CONSTRAINT check_feedback_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
	CONSTRAINT check_feedback_category CHECK (category IN ('suggestion', 'bug', 'correction', 'other')),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE INDEX ix_feedbacks_status ON feedbacks (status);

CREATE INDEX ix_feedbacks_user_id ON feedbacks (user_id);

CREATE TABLE question_options (
	id UUID NOT NULL,
	question_id UUID NOT NULL,
	label VARCHAR(10) NOT NULL,
	content TEXT NOT NULL,
	image_url VARCHAR(500),
	score INTEGER NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(question_id) REFERENCES questions (id)
);

CREATE TABLE chat_sessions (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	exam_session_id UUID,
	question_id UUID,
	title VARCHAR(255) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(exam_session_id) REFERENCES exam_sessions (id),
	FOREIGN KEY(question_id) REFERENCES questions (id)
);

CREATE INDEX ix_chat_session_user_exam ON chat_sessions (user_id, exam_session_id);

CREATE INDEX ix_chat_session_user_question ON chat_sessions (user_id, question_id);

CREATE TABLE answers (
	id UUID NOT NULL,
	session_id UUID NOT NULL,
	question_id UUID NOT NULL,
	option_id UUID,
	selected_option VARCHAR(10) NOT NULL,
	points_earned INTEGER NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(session_id) REFERENCES exam_sessions (id),
	FOREIGN KEY(question_id) REFERENCES questions (id),
	FOREIGN KEY(option_id) REFERENCES question_options (id)
);

CREATE INDEX ix_answer_session_question ON answers (session_id, question_id);

CREATE INDEX ix_answers_session_id ON answers (session_id);

CREATE TABLE chat_messages (
	id UUID NOT NULL,
	session_id UUID NOT NULL,
	role VARCHAR(20) NOT NULL,
	content TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(session_id) REFERENCES chat_sessions (id)
);
CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY);
INSERT INTO alembic_version VALUES ('667ecbb432df');
