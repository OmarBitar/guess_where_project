var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

// user schema 
var photoSchema   = new Schema({
    img_url: { type: String, required: true, index: { unique: true }},
    longitude: { type: Number, required: true, index: { unique: false }},
    latitude: { type: Number, required: true, index: { unique: false }},
    time : { type : Date, default: Date.now }
})

//middleware that will check if connectedd to the database
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection to data base error!'));
db.once('open', function() {
  console.log('we are connected to the photos collection!');
});




module.exports = mongoose.model('photo', photoSchema);//the models contains(collection name, collection schema)