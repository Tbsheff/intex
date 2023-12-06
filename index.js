let express = require("express");
let session = require('express-session');
let app = express();
const port = process.env.PORT || 3000;
let format = require('date-fns/format');
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
        database: "social_sense",
        port: process.env.RDS_PORT || 5432
    },
    debug: true
});

let bcrypt = require('bcrypt');
const { timeStamp } = require("console");
let saltRounds = 10;

function isAuthenticated(req, res, next) {
    console.log(req.session.user);
    if (req.session && req.session.user) {

        return next(); // User is authenticated, proceed to the next function

    }
    // User is not authenticated
    res.redirect('/login');
}

function isAdmin(req, res, next) {
    console.log(req.session.user);
    if (req.session && req.session.user && req.session.user.admin) {
        return next(); // User is authenticated, proceed to the next function

    }
    // User is not authenticated
    res.redirect('/login');
}


app.get("/results", isAuthenticated, (req, res) => {
    knex.select(
        '*'
    )
        .from('survey as s')
        .leftJoin('gender as g', 's.gender_id', 'g.gender_id')
        .leftJoin('relationship_status as rs', 'rs.relationship_status_id', 's.relationship_status_id')
        .leftJoin('occupation as o', 'o.occupation_id', 's.occupation_id')
        .then(rows => {
            let formattedRows = rows.map(row => {
                return {
                    ...row,
                    formatted_time_stamp: format(new Date(row.time_stamp), 'MM-dd-yyyy hh:mm aa')
                };
            });
            return formattedRows;
        })
        .then(results => {
            console.log(results);
            res.render("results", { surveyresults: results, user: req.session.user });
        })

}
);

app.get("/choosesurvey/:surveyID", isAuthenticated, (req, res) => {
    knex.select(
        's.survey_id',
        's.time_stamp',
        's.age',
        's.gender_id',
        's.relationship_status_id',
        's.occupation_id',
        's.location',
        's.use_social',
        's.time_spent_on_social_media',
        's.frequency_of_social_media_distraction',
        's.how_often_distracted',
        's.feel_restless',
        's.how_easily_distracted',
        's.how_much_worry',
        's.difficulty_concentrating',
        's.how_often_compare',
        's.comparison_feelings',
        's.seek_validation_from_social_media',
        's.how_often_depressed',
        's.frequency_of_changing_interests',
        's.how_often_sleep_issues',
        'g.gender_description',
        'rs.relationship_status_description',
        'o.occupation_description',
        knex.raw(`(
            SELECT string_agg(social_media_platform, ', ')
            FROM social_media
            WHERE social_media.survey_id = s.survey_id
            GROUP BY social_media.survey_id
        ) AS social_media_platforms`),
        knex.raw(`(
            SELECT string_agg(organization.organization, ', ')
            FROM organization
            WHERE organization.survey_id = s.survey_id
        ) AS organizations`)
    )

        .from('survey as s')
        .leftJoin('gender as g', 's.gender_id', 'g.gender_id')
        .leftJoin('relationship_status as rs', 'rs.relationship_status_id', 's.relationship_status_id')
        .leftJoin('occupation as o', 'o.occupation_id', 's.occupation_id')
        .leftJoin('organization as og', 'og.survey_id', 's.survey_id')
        .leftJoin('social_media as sm', 'sm.survey_id', 's.survey_id')

        .where("s.survey_id", req.params.surveyID)
        .then(rows => {
            let formattedRows = rows.map(row => {
                return {
                    ...row,
                    formatted_time_stamp: format(new Date(row.time_stamp), 'MM-dd-yyyy hh:mm aa')
                };
            });
            return formattedRows;
        })
        .then(formattedRows => {
            res.render("displayresult", { resultobject: formattedRows, user: req.session.user });
        }).catch(err => {
            console.log(err);
            res.status(500).json({ err });
        });
});

app.get("/", (req, res) => res.render("index", { user: req.session.user }));

app.get("/respond", (req, res) => {
    res.render("getResponse", { user: req.session.user });
}
);

app.get("/login", (req, res) => res.render("login", { req: req, user: req.session.user }));

app.post("/login", (req, res) => {
    // Extract the username and plain text password from the request
    const { username, password } = req.body;

    // Retrieve the user's hashed password from the database
    knex.select('*').from('security_table').where({ username })
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
                    req.session.user = { username: user.username, id: user.user_id, admin: user.is_admin };
                    console.log(req.session.user)
                    if (user.is_admin) {
                        res.redirect("/accounts")
                    } else {
                        res.redirect('/account');
                    }


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

const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    } else {
      return res.redirect('/');
    }
  };
  
  // Routes
app.get('/', isLoggedIn, (req, res) => {
res.send('You are logged in. <a href="/logout">Logout</a>');
});

app.get('/logout', (req, res) => {
    // Destroy the session to log the user out
    req.session.destroy((err) => {
      if (err) {
        console.error(err);
      }
      res.redirect('/');
    });
});



app.get("/signup", isAuthenticated, (req, res) => res.render("signup", { user: req.session.user }));

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


app.get("/survey", (req, res) => res.render("getResponse", { user: req.session.user }));

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
    let organizationTypes = req.body.organization_type;

    if (!organizationTypes) {
        return res.status(400).json({ error: 'No organization type selected' });
    }

    // If only one checkbox is checked, make sure it's treated as an array
    if (!Array.isArray(organizationTypes)) {
        organizationTypes = [organizationTypes];
    }

    let socialMediaPlatforms = req.body.social_media;

    // Check if any social media platform is selected
    if (!socialMediaPlatforms) {
        return res.status(400).json({ error: 'No social media platform selected' });
    }

    // If only one checkbox is checked, make sure it's treated as an array
    if (!Array.isArray(socialMediaPlatforms)) {
        socialMediaPlatforms = [socialMediaPlatforms];
    }


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
                time_spent_on_social_media: req.body.time_spent_social_media,
                location: 'Provo',
                frequency_of_social_media_distraction: req.body.rating,
                how_often_distracted: req.body.distracted,
                feel_restless: req.body.restless,
                how_easily_distracted: req.body.easydistracted,
                how_much_worry: req.body.worries,
                difficulty_concentrating: req.body.concentration,
                how_often_compare: req.body.comparison,
                comparison_feelings: req.body.feelings,
                seek_validation_from_social_media: req.body.validation,
                how_often_depressed: req.body.depression,
                frequency_of_changing_interests: req.body.interestFluctuation,
                how_often_sleep_issues: req.body.sleepIssues,
                use_social: req.body.social_media_use
            }, 'survey_id');
            let iCount = 1;
            for (const type of organizationTypes) {
                await trx('organization').insert({
                    survey_id: surveyId[0].survey_id,
                    organization_number: iCount,
                    organization: type
                });
                iCount++;
            };
            iCount = 1;
            for (const platform of socialMediaPlatforms) {
                await trx('social_media').insert({
                    survey_id: surveyId[0].survey_id,
                    social_media_number: iCount,
                    social_media_platform: platform
                });
                iCount++;
            }

            await trx.commit();
            console.log({ survey_id: surveyId[0] });
            res.redirect("/");
        }
        catch (error) {
            await trx.rollback();
            res.status(500).json({ error: error.message });
        }
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

app.get("/accounts", isAuthenticated, isAdmin, (req, res) => {
    knex.select("*")
        .from("user_table as ut")
        .join("security_table as st", "st.user_id", "ut.user_id")
        .then(results => {
            console.log(results);
            res.render("viewAccounts", { allAccounts: results, user: req.session.user });
        });
});

app.get("/account", isAuthenticated, (req, res) => {
    knex.select("*")
        .from("user_table as ut")
        .join("security_table as st", "st.user_id", "ut.user_id")
        .where("st.user_id", "=", req.session.user.id)
        .then(results => {
            console.log(results);
            res.render("viewMyAccount", { allAccounts: results, user: req.session.user });
        });
});




app.listen(port, () => console.log("Website started"));    
