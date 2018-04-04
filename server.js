var express  = require('express');
var app      = express();                               // create our app w/ express
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override');
var multer  =   require('multer');
var multerS3 = require('multer-s3')
// import entire SDK
var AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: "<AWS ACCESSKEYID>",
    secretAccessKey: "AWS SECRETACCESSKEY",
    "region": "us-east-1"  
});
var s3 = new AWS.S3({ params: {Bucket: '<S3 Bucket Name>'} });
var bucketName = 'S3 Bucket Name';

app.use(function(req, res, next) { //allow cross origin requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    res.header("Access-Control-Max-Age", "3600");
    res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    next();
});

// configuration
app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
app.use('/public/uploads',express.static(__dirname + '/public/uploads'));
app.use(morgan('dev'));               
app.use(bodyParser.json({limit: '50mb'}));                          // log every request to the console
app.use(bodyParser.urlencoded({limit: '50mb','extended':'true'}));            // parse application/x-www-form-urlencoded                                // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json


// file upload code
var storage1 = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, 'https://s3.amazonaws.com/<S3 Bucket Name>/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
});

var uploadSingle = multer({ //multer settings
        // storage: storage1
        storage: multerS3({
            s3: s3,
            bucket: 'mavieapp',
            acl: 'public-read',
            key: function (req, file, cb) {
               var datetimestamp = Date.now();
               cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
            }
        })
}).single('file');


// Upload base64 image in s3
app.post('/api/getBase64ImgPath', function(req, res) {
    var name = 'file-' + Math.floor(10000000000 + Math.random() * 90000000000)+".jpg";
    buf = new Buffer(req.body.base64ImageData.replace(/^data:image\/\w+;base64,/, ""),'base64');
      var data = {
        ACL: 'public-read',
        Key: name, 
        Body: buf,
        ContentEncoding: 'base64',
        ContentType: 'image/jpeg'
      };
      s3.putObject(data, function(err, data){
          if (err) { 
            console.log(err);
            console.log('Error uploading data: ', data); 
          } else {
            res.json({path:"https://s3.amazonaws.com/<S3 Bucket Name>/"+name});
          }
      });
});


// delete image in s3 

// delete product
app.delete('/api/removeProduct', function(req, res) {
   var delete_images = req.body.images;
   var params = {
      Delete: { // required
        Objects: [],
      },
    };
    delete_images.forEach(function(file_path) {
        console.log(file_path);
        var file  = file_path.split('/');
        file = file[file.length-1]
        console.log(file);
        // fs.unlink(file_path);
        params.Delete.Objects.push({"Key":file})
    });
    console.log(JSON.stringify(params));
    s3.deleteObjects(params, function (err, data) {
        if (data) {
            console.log("File deleted successfully",data);
        }
        else {
            console.log("Check if you have sufficient permissions : "+err);
        }
    });
});


app.listen(process.env.PORT || 9000, function(){console.log("App listening on port 9000");});