-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Account (
  id text NOT NULL,
  userId text NOT NULL,
  type text NOT NULL,
  provider text NOT NULL,
  providerAccountId text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  CONSTRAINT Account_pkey PRIMARY KEY (id),
  CONSTRAINT Account_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.Board (
  id text NOT NULL,
  type text CHECK (type = ANY (ARRAY['country'::text, 'school'::text])),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  country_id bigint,
  description text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  schoolId bigint,
  CONSTRAINT Board_pkey PRIMARY KEY (id),
  CONSTRAINT Board_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.Country(id),
  CONSTRAINT Board_schoolId_fkey FOREIGN KEY (schoolId) REFERENCES public.schools(id)
);
CREATE TABLE public.BoardFollow (
  id text NOT NULL,
  userId text NOT NULL,
  boardId text NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT BoardFollow_pkey PRIMARY KEY (id),
  CONSTRAINT BoardFollow_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT BoardFollow_boardId_fkey FOREIGN KEY (boardId) REFERENCES public.Board(id)
);
CREATE TABLE public.Bookmark (
  id text NOT NULL,
  userId text NOT NULL,
  postId text NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Bookmark_pkey PRIMARY KEY (id),
  CONSTRAINT Bookmark_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Bookmark_postId_fkey FOREIGN KEY (postId) REFERENCES public.Post(id)
);
CREATE TABLE public.Comment (
  id text NOT NULL,
  content text NOT NULL,
  userId text NOT NULL,
  postId text NOT NULL,
  parentId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt timestamp without time zone,
  CONSTRAINT Comment_pkey PRIMARY KEY (id),
  CONSTRAINT Comment_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Comment_postId_fkey FOREIGN KEY (postId) REFERENCES public.Post(id),
  CONSTRAINT Comment_parentId_fkey FOREIGN KEY (parentId) REFERENCES public.Comment(id)
);
CREATE TABLE public.CommentLike (
  id text NOT NULL,
  userId text NOT NULL,
  commentId text NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CommentLike_pkey PRIMARY KEY (id),
  CONSTRAINT CommentLike_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT CommentLike_commentId_fkey FOREIGN KEY (commentId) REFERENCES public.Comment(id)
);
CREATE TABLE public.CommentRepost (
  id text NOT NULL,
  userId text NOT NULL,
  commentId text NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CommentRepost_pkey PRIMARY KEY (id),
  CONSTRAINT CommentRepost_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT CommentRepost_commentId_fkey FOREIGN KEY (commentId) REFERENCES public.Comment(id)
);
CREATE TABLE public.Country (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  country_zh text NOT NULL,
  country_en text,
  continent text,
  CONSTRAINT Country_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Draft (
  id text NOT NULL,
  userId text NOT NULL,
  content text NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Draft_pkey PRIMARY KEY (id),
  CONSTRAINT Draft_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.Hashtag (
  postId text NOT NULL,
  content text NOT NULL,
  CONSTRAINT Hashtag_pkey PRIMARY KEY (postId, content),
  CONSTRAINT Hashtag_postId_fkey FOREIGN KEY (postId) REFERENCES public.Post(id)
);
CREATE TABLE public.Like (
  id text NOT NULL,
  userId text NOT NULL,
  postId text NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Like_pkey PRIMARY KEY (id),
  CONSTRAINT Like_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Like_postId_fkey FOREIGN KEY (postId) REFERENCES public.Post(id)
);
CREATE TABLE public.Notification (
  id text NOT NULL,
  userId text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['comment_reply'::text, 'like'::text, 'comment_like'::text])),
  actorId text NOT NULL,
  postId text,
  commentId text,
  read boolean NOT NULL DEFAULT false,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Notification_pkey PRIMARY KEY (id),
  CONSTRAINT Notification_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Notification_actorId_fkey FOREIGN KEY (actorId) REFERENCES public.User(id),
  CONSTRAINT Notification_postId_fkey FOREIGN KEY (postId) REFERENCES public.Post(id),
  CONSTRAINT Notification_commentId_fkey FOREIGN KEY (commentId) REFERENCES public.Comment(id)
);
CREATE TABLE public.Post (
  id text NOT NULL,
  content text NOT NULL,
  authorId text NOT NULL,
  repostId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt timestamp without time zone,
  title text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'deleted'::text])),
  type text NOT NULL DEFAULT 'normal'::text CHECK (type = ANY (ARRAY['normal'::text, 'rating'::text])),
  CONSTRAINT Post_pkey PRIMARY KEY (id),
  CONSTRAINT Post_authorId_fkey FOREIGN KEY (authorId) REFERENCES public.User(id),
  CONSTRAINT Post_repostId_fkey FOREIGN KEY (repostId) REFERENCES public.Post(id)
);
CREATE TABLE public.PostBoard (
  id text NOT NULL,
  postId text NOT NULL,
  boardId text NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PostBoard_pkey PRIMARY KEY (id),
  CONSTRAINT PostBoard_postId_fkey FOREIGN KEY (postId) REFERENCES public.Post(id),
  CONSTRAINT PostBoard_boardId_fkey FOREIGN KEY (boardId) REFERENCES public.Board(id)
);
CREATE TABLE public.SchoolRating (
  postId text NOT NULL,
  livingConvenience integer NOT NULL CHECK ("livingConvenience" >= 1 AND "livingConvenience" <= 5),
  costOfLiving integer NOT NULL CHECK ("costOfLiving" >= 1 AND "costOfLiving" <= 3),
  courseLoading integer NOT NULL CHECK ("courseLoading" >= 1 AND "courseLoading" <= 5),
  schoolId bigint NOT NULL,
  CONSTRAINT SchoolRating_postId_fkey FOREIGN KEY (postId) REFERENCES public.Post(id),
  CONSTRAINT SchoolRating_schoolId_fkey FOREIGN KEY (schoolId) REFERENCES public.schools(id)
);
CREATE TABLE public.SchoolWishList (
  id text NOT NULL,
  userId text NOT NULL,
  schoolId bigint NOT NULL,
  note text,
  order integer,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT SchoolWishList_pkey PRIMARY KEY (id),
  CONSTRAINT SchoolWishList_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT SchoolWishList_schoolId_fkey FOREIGN KEY (schoolId) REFERENCES public.schools(id)
);
CREATE TABLE public.Session (
  id text NOT NULL,
  sessionToken text NOT NULL,
  userId text NOT NULL,
  expires timestamp without time zone NOT NULL,
  CONSTRAINT Session_pkey PRIMARY KEY (id),
  CONSTRAINT Session_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.User (
  id text NOT NULL,
  userID text,
  name text,
  email text,
  emailVerified timestamp without time zone,
  image text,
  bio text,
  backgroundImage text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT User_pkey PRIMARY KEY (id)
);
CREATE TABLE public.UserQualification (
  id text NOT NULL,
  userId text NOT NULL UNIQUE,
  college text,
  grade text,
  gpa numeric,
  toefl integer,
  ielts numeric,
  toeic integer,
  createdAt timestamp with time zone NOT NULL DEFAULT now(),
  updatedAt timestamp with time zone NOT NULL DEFAULT now(),
  applicationGroup text,
  CONSTRAINT UserQualification_pkey PRIMARY KEY (id),
  CONSTRAINT UserQualification_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.VerificationToken (
  identifier text NOT NULL,
  token text NOT NULL UNIQUE,
  expires timestamp without time zone NOT NULL,
  CONSTRAINT VerificationToken_pkey PRIMARY KEY (identifier, token)
);
CREATE TABLE public.schools (
  name_zh text NOT NULL,
  name_en text,
  country_id bigint,
  url text,
  second_exchange_eligible boolean DEFAULT false,
  application_group text,
  gpa_requirement text,
  grade_requirement text,
  language_requirement text,
  restricted_colleges text,
  quota text,
  academic_calendar text,
  registration_fee text,
  accommodation_info text,
  notes text,
  latitude numeric,
  longitude numeric,
  id bigint NOT NULL,
  CONSTRAINT schools_pkey PRIMARY KEY (id),
  CONSTRAINT fk_schools_country FOREIGN KEY (country_id) REFERENCES public.Country(id)
);