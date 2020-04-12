const localStrategy = require('passport-local');
const bcrypt = require('bcrypt')
const User = require('../models/User');

function initialize(passport) {
    const authenticateUser = async (email, password, done) => {
        User.findOne({email: email},
            async (err, user) => {
                if (err) throw err
                if (!user) return done(null, false, { message: 'Wrong email' })
                
                try {
                    if (await bcrypt.compare(password, user.password)) {
                        console.log(user.name)
                        return done(null, user)
                    } else {
                        return done(null, false, { message: 'Password incorrect' })
                    }
                } catch (e) {
                    return done(e)
                }
            })
    }

    passport.use(new localStrategy({ usernameField: 'email' },
        authenticateUser))
    passport.serializeUser((user, done) => done(null, user))
    passport.deserializeUser((id, done) => {return done(null, id)})
}

module.exports = initialize