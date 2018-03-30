const passport      = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User          = require('../models/user');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) =>{
    try{
        const user = await User.findById(id);
        done(null, user);
    } catch (error){
        done(error, null);
    }
});


passport.use('local', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: false
}, async (username, password, done) => {
        try{
            // Check if username exist
            const user = await User.findOne({'username': username});
            console.log('The User:',user);
            if (!user) {
                console.log('User not found');
                return done(null, false, {message: 'Unknown User'});
            }

            // Check if user has verified their account
            if(!user.confirmed) {
                console.log('Your must verify your account.');
                return done(null, false, {message: 'Your must verify your account.'})
            }

            // Check if password is correct for this account
            const isValid = await User.comparePasswords(password, user.password);
            if (isValid) {
                console.log('Valid pass');
                return done(null, user);
            } else {
                console.log('Invalid pass');
                return done(null, false, {message: 'Incorrect Password'});
            }


        } catch (error) {
            console.log('Error in strategy');
            return done(error, false);
        }


    } // End async
));