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

app.post("/survey", (req, res) => {
    console.log(req.body);

    // Mapping for occupation
    const occupationMap = {
        'University Student': 1,
        'School Student': 2,
        'Salaried Worker': 3,
        'Retired': 4
    };

    // Mapping for gender
    const genderMap = {
        'Female': 1,
        'Male': 2,
        'Non-binary': 3,
        'Trans': 4,
        'Other': 5
    };

    const relationshipStatusMap = {
        'In a relationship': 1,
        'Single': 2,
        'Married': 3,
        'Divorced': 4
    };

    // Retrieve the IDs from the maps
    let relationshipStatusId = relationshipStatusMap[req.body.relationship_status];
    let occupationId = occupationMap[req.body.occupation];
    let genderId = genderMap[req.body.gender];

    // Check if we got valid IDs
    if (!occupationId) {
        return res.status(400).json({ error: 'Invalid occupation' });
    }

    if (!genderId) {
        return res.status(400).json({ error: 'Invalid gender' });
    }

    if (!relationshipStatusId) {
        return res.status(400).json({ error: 'Invalid relationship status' });
    }

    knex.transaction(async (trx) => {
        try {
            let surveyId = await trx('survey').insert({
                age: req.body.age,
                gender_id: genderId,
                relationship_status_id: relationshipStatusId,
                occupation_id: occupationId,
            }, 'survey_id');

            await trx.commit();
            console.log({ survey_id: surveyId[0] });
        } catch (error) {
            await trx.rollback();
            res.status(500).json({ error: error.message });
        }
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});


app.get("/displayresults", (req, res) => {
    knex.select("*")
        .from("survey s")
        .join("occupation p on o.occupation_id = s.occupation_id")
}
)



app.listen(port, () => console.log("Website started"));    
