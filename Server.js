const express = require("express");
const routes = require('./routes/routes.js');
const mongoose = require('mongoose');

const app = express();
var MongoUrl = ''

if(process.env.MONGO_URL) { 
    MongoUrl = `mongodb://${process.env.MONGO_URL}/dash`
}
else {
    MongoUrl = 'mongodb://localhost/dash'
}

mongoose.connect(MongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
const db = mongoose.connection
db.on('error', (error) => console.error(error))
db.once('open', () => console.log("Connected to db"))

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/css'));

app.use(express.urlencoded({extended: false}));
app.use(express.json());

//// see routes.js
app.use(routes);

app.use((err, req, res, next) => {
    console.log(err);
    res.status(422).send({error: err.message});
});

app.listen(process.env.port || 8080, function () {
    console.log("Live at Port 8080");
});
