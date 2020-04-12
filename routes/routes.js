const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const session = require('express-session')
const flash = require('express-flash');
const methodOverride = require('method-override')
const fetch = require("node-fetch");
const request = require("request")
const fs = require('fs')

const passport = require('passport');
const passportInit = require('../config/passport-setup');
passportInit(passport)

router.use(express.urlencoded({ extended: false }));
router.use(flash())
router.use(session({
    secret: "Boulbaga",
    resave: false,
    saveUninitialized: false,
}))
router.use(passport.initialize())
router.use(passport.session())
router.use(methodOverride('_method'))

//// ABOUT

router.get('/about.json', (req, res) => {
    const about = JSON.parse(fs.readFileSync('./views/about.json'))
    res.send(about)
})

//// Authentication

router.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login');
});

router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

router.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register');
});

router.post("/register", checkNotAuthenticated, (req, res) => {
    try {
        User.findOne({ email: req.body.email }).then(async (user) => {
            if (user) {
                req.flash('error', 'Email is already taken')
                res.redirect('/register')
            } else {
                const hashedPassword = await bcrypt.hash(req.body.password, 10)
                User.create({
                    email: req.body.email,
                    name: req.body.name,
                    password: hashedPassword
                }).then((user) => {
                    // console.log(user)
                    res.status(201).json(user);
                });
                res.redirect('/login');
                console.log(user);
            }
        })

    } catch {
        res.status(500);
        res.redirect('/register');
    }
});

router.delete("/logout", (req, res) => {
    req.logout()
    res.redirect('/login')
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

//// Application

const widgets = {
    "meteo": [
        "temperature"
    ],
    "exchange rates": [
        "currency"
    ],
    "youtube": [
        "channel",
        "video"
    ],
    "steam": [
        "game"
    ]
}

router.get('/', checkAuthenticated, (req, res) => {
    res.render('home', { name: req.user.name, widgets: req.user.widgets });
});

router.get('/widget', checkAuthenticated, (req, res) => {
    res.render('widget', { name: req.user.name, widgets: widgets, user: req.user.widgets })
})

router.patch('/addW/:item', (req, res) => {
    const s = req.params.item + "/" + req.body.param
    if (!req.user.widgets.some(r => r === s)) {
        User.findByIdAndUpdate(req.user._id, { $push: { widgets: s } }).then(() => {
            User.findById(req.user._id).then((user) => {
                req.session.passport.user = user
                req.session.save()
            })
            res.redirect('/widget')
        })
    } else {
        User.findByIdAndUpdate(req.user._id, { $pull: { widgets: s } }).then(() => {
            User.findById(req.user._id).then((user) => {
                req.session.passport.user = user
                req.session.save()
            })
            res.redirect('/widget')
        })
    }
})

router.get('*', checkAuthenticated, (req, res) => {
    res.redirect('/')
})

//// Widgets call

router.post('/Temperature/:city', (req, res) => {
    fetch('http://api.openweathermap.org/data/2.5/weather?q=' + req.params.city + '&appid=' + process.env.OPENWEATHER_API_KEY + '&units=metric')
        .then(Response => Response.json()
            .then(data => {
                res.json([data.main.temp, data.main.feels_like])
            }))
        .catch(_ => console.log("Wrong city name"))
})

router.post("/trade/:base", (req, res) => {
    fetch('https://api.exchangeratesapi.io/latest?base=' + req.params.base)
        .then(resp => resp.json())
        .then((json) => {
            res.json(json.rates)
        }).catch(() => console.log("error"))
})

function youtubeCounter(config) {
    return new Promise((result, error) => {
        fetch('https://www.googleapis.com/youtube/v3/channels?&key=' + config['api_key'] + '&forUsername=' + config['name'] + '&part=id')
            .then(Response => Response.json())
            .then(data => console.log(data.items))
            .catch(err => console.log('Wrong channel name'))


        fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics&id=' + config['channel_id'] + '&key=' + config['api_key'])
            .then(Response => Response.json())
            .then(data => result(data))
            .catch(err => console.log('Wrong channel_id'))
    });
};

function videoInfo(config) {
    return new Promise((result, error) => {
        fetch('https://www.googleapis.com/youtube/v3/videos?id=' + config['video_id'] + '&key=' + config['api_key'] + '&part=snippet,contentDetails,statistics,status')
            .then(Response => Response.json())
            .then(data => result(data.items[0].statistics))
            .catch(err => console.log('Wrong video id'))
    });
};

/* function commentList(config) {
    return new Promise((result, error) => {
        fetch('https://www.googleapis.com/youtube/v3/commentThreads?id=' + config['video_id'] + '&key=' + config['api_key'] + '&part=snippet,replies&maxResults=100')
            .then(Response => Response.json())
            .then(data => console.log(data))
            .catch(err => console.log('Wrong video id'))
        result(null);
    });
}; */

router.post('/youtubeAbo/:channel', async function (req, res) {
    var config = {
        api_key: process.env.YOUTUBE_API_KEY,
        channel_id: process.env.YT_CHANNEL_ID,
        name: req.params.channel
    };
    var result = await youtubeCounter(config)
    // console.log(result.items[0].statistics)
    res.json(result.items[0].statistics)
});

router.post('/youtubeView/:videoID', async (req, res) => {
    var config = {
        api_key: process.env.YOUTUBE_API_KEY,
        video_id: req.params.videoID,
    }
    var info = await videoInfo(config);
    // console.log(info)
    res.json(info)
})

function GetSteamGame(inputGame) {
    return new Promise((result, error) => {

        var steam = 'http://store.steampowered.com/api/appdetails/?appids=' + inputGame

        request.get(steam, function (error, steamHttpResponse, steamHttpBody) {
            var pars = JSON.parse(steamHttpBody);
            if (!pars[inputGame].success) result({ name: 'not found' })
            else {
                var name = pars[inputGame].data.name
                request.get('http://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?format=json&appid=' + inputGame, function (error, steamHttpResponse, steamHttpBody) {
                    var pars2 = JSON.parse(steamHttpBody);
                    result({ name, player_count: pars2.response.player_count });
                });
            }
        })
    })
};

router.post("/steam/:game", async (req, res) => {
    var json = await GetSteamGame(req.params.game)
    res.json(json)
})

module.exports = router;