let express = require("express");
let session = require('express-session');
let app = express();

app.use(session({
    secret: 'asd;lfkja;ldfkjlk123389akjdhla987897akjh78111ih',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));



let path = require("path");

let knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "",
        user: process.env.RDS_USERNAME || "",
        password: process.env.RDS_PASSWORD || "",
        database: process.env.RDS_DB_NAME || "",
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
    },
    debug: true
});

let bcrypt = require('bcrypt');
let saltRounds = 10;


