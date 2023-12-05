let express = require("express");
let session = require('express-session');
let app = express();
const port = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");



app.use(session({
    secret: 'asd;lfkja;ldfkjlk123389akjdhla987897akjh78111ih',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));



let path = require("path");
app.use(express.static(path.join(__dirname, "public")));

let knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "awseb-e-ee3vw2q82p-stack-awsebrdsdatabase-moo0bhesoomr.cf6qafoa0mp0.us-east-2.rds.amazonaws.com",
        user: process.env.RDS_USERNAME || "ebroot",
        password: process.env.RDS_PASSWORD || "cougarcruiser",
        database: process.env.RDS_DB_NAME || "social_sense",
        port: process.env.RDS_PORT || 5432
    },
    debug: true
});

let bcrypt = require('bcrypt');
let saltRounds = 10;

function isAuthenticated(req, res, next) {
    console.log(req.session.user);
    if (req.session && req.session.user) {
        console.log(req.session.user);
        return next(); // User is authenticated, proceed to the next function

    }
    // User is not authenticated
    res.redirect('/login');
}



app.get("/results", (req, res) => res.render("results"));



app.get("/", (req, res) => res.render("index"));

app.get("/respond", (req, res) => {
    res.render("getResponse");
}
);

app.get("/login", (req, res) => res.render("login", { req }));

app.post("/login", (req, res) => {
    // Extract the username and plain text password from the request
    const { username, password } = req.body;

    // Retrieve the user's hashed password from the database
    knex.select('*').from('security').where({ username })
        .then(users => {
            if (users.length === 0) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }

            let user = users[0];
            let hash = users[0].password;

            // Compare the provided password with the stored hash
            bcrypt.compare(password, hash, (err, result) => {
                if (err) {
                    res.status(500).json({ error: 'Error verifying password' });
                    return;
                }

                if (result) {
                    // Login successful
                    req.session.user = { username: user.username, id: user.student_id };
                    console.log(req.session.user)
                    res.redirect('/rides');

                } else {
                    // Passwords do not match
                    res.status(401).json({ error: 'Invalid username or password' });
                }
            });
        })
        .catch(error => {
            console.error('Error during login:', error);
            res.status(500).json({ error: error.message || error });
        });
});


app.get("/signup", (req, res) => res.render("signup"));

app.post("/signup", (req, res) => {
    console.log(req.body);
    // Extract the plain text password from the request
    let plainTextPassword = req.body.password;

    // Hash the password
    bcrypt.hash(plainTextPassword, saltRounds, (err, hash) => {
        if (err) {
            res.status(500).json({ error: 'Error hashing password' });
            return;
        }

        // Start a transaction
        knex.transaction(trx => {
            // insert into the user table
            return trx.insert({
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email: req.body.email
            })
                .into('user_table')
                .returning('user_id')
                .then(userIds => {
                    // insert into the Security table
                    console.log('Inserted user ID:', userIds[0]);

                    return trx('security_table').insert({
                        username: req.body.username,
                        password: hash,
                        user_id: userIds[0].user_id,
                        is_admin: false // Use the returned user_id
                    });
                })
        })
            .then(() => {
                res.redirect("/"); // Redirect if the transaction is successful
            })
            .catch(error => {
                res.status(500).json({ error }); // Handle errors
            });
    });
});


app.get("/survey", (req, res) => res.render("getResponse"));





app.listen(port, () => console.log("Website started"));    
