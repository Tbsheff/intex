let express = require("express");
let session = require('express-session');
let app = express();
const port = process.env.PORT || 3000;


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


app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.render("index"));









app.listen(port, () => console.log("Website started"));    
