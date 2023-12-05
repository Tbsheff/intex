let pg = require("pg");

let knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "awseb-e-ee3vw2q82p-stack-awsebrdsdatabase-moo0bhesoomr.cf6qafoa0mp0.us-east-2.rds.amazonaws.com",
        user: process.env.RDS_USERNAME || "ebroot",
        password: process.env.RDS_PASSWORD || "cougarcruiser",
        database: "social_sense",
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
    },
    debug: true
});

knex.raw('SELECT NOW() as currentTime')
    .then(result => {
        console.log('Connected to the database. Current timestamp:', result.rows[0].currenttime);
    })
    .catch(error => {
        console.error('Error connecting to the database:', error.message);
    })
    .finally(() => {
        // Close the Knex connection
        knex.destroy();
    });