var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var bcrypt 		 = require('bcrypt-nodejs');

// user schema 
var UserSchema   = new Schema({
	name: String,
	username: { type: String, required: true, index: { unique: true }},
	password: { type: String, required: true, select: false },//'select: false' means to not show when calling GET METHOD on postman
	discoveries: {type: Number, required: true},
	uploads: {type: Number, required: true}
});

//middleware that will check if connectedd to the database
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection to data base error!'));
db.once('open', function() {
  console.log('we are connected to the users collection!');
});


// hash the password before the user is saved
UserSchema.pre('save', function(next) {
	var user = this;

	// hash the password only if the password has been changed or user is new
	if (!user.isModified('password')) return next();

	// generate the hash
	bcrypt.hash(user.password, null, null, function(err, hash) {
		if (err) return next(err);

		// change the password to the hashed version
		user.password = hash;
		next();
	});
});

// create a method to compare a given password with the database hash
UserSchema.methods.comparePassword = function(password) {
	var user = this;

	return bcrypt.compareSync(password, user.password);
};


module.exports = mongoose.model('user', UserSchema);//the models contains(collection name, collection schema)