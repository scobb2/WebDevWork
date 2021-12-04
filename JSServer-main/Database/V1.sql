CREATE TABLE Person (
   id int auto_increment primary key,
   firstName varchar(30),
   lastName varchar(50) not null,
   email varchar(150) not null,
   password varchar(50),
   whenRegistered datetime not null,
   termsAccepted datetime,
   role int unsigned not null,  # 0 normal, 1 admin
   unique key(email)
);

CREATE TABLE Conversation (
   id int auto_increment primary key,
   ownerId int,
   title varchar(80) not null,
   lastMessage datetime,
   constraint FKMessage_ownerId foreign key (ownerId) references Person(id)
    on delete cascade,
   unique key UK_title(title)
);

CREATE TABLE Message (
   id int auto_increment primary key,
   cnvId int not null,
   prsId int not null,
   whenMade datetime not null,
   content varchar(5000) not null,
   numLikes int default 0,
   constraint FKMessage_cnvId foreign key (cnvId) references Conversation(id)
    on delete cascade,
   constraint FKMessage_prsId foreign key (prsId) references Person(id)
    on delete cascade
);

CREATE TABLE Likes (
   id int auto_increment primary key,
   prsId int not null,
   msgId int not null,
   constraint FKLikes_prsId foreign key (prsId) references Person(id)
    on delete cascade,
   constraint FKLikes_msgId foreign key (msgId) references Message(id)
    on delete cascade
);

INSERT INTO Person (firstName, lastName, email, password, whenRegistered, role)
   VALUES ("Joe", "Admin", "adm@11.com", "password", NOW(), 1);