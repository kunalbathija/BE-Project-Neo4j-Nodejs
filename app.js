if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session1 = require('express-session')
const methodOverride = require('method-override')

var app = express();

const initializePassport = require('./passport-config')
initializePassport(
    passport, 
    email => users.find(user => user.email === email), 
    id => users.find(user => user.id === id)
)

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false}));
app.use(flash())
app.use(session1({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "123456"))
var session = driver.session()

var users = [
    { id: '1613226927108', name: 'Kunal', email: 'kunalbathija97@gmail.com', password: '123456', type: 'Government'},
    { id: '1613226927109', name: 'Kalpesh', email: 'kalpeshbhole@gmail.com', password: '123456', type: 'School'},

]

//Home Route
app.get('/', checkAuthenticated, function(req, res){
    session
        .run("MATCH (n: Government) RETURN n")
        .then(function(result){
            var governArr = [];
            result.records.forEach(function(record){
                governArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
                //console.log(record._fields[0]);
            });

            session
                .run("MATCH (n: School) RETURN n")
                .then(function(result2){
                    var schoolArr = [];
                    result2.records.forEach(function(record){
                        schoolArr.push({
                            id: record._fields[0].identity.low,
                            name: record._fields[0].properties.name
                        });
                    });

                    res.render('index', {
                        governs: governArr,
                        schools: schoolArr
                    });
                })
            
        })
        .catch(function(error){
            console.log(error);
        });
});


//Get Add
app.get('/add', checkAuthenticated, function(req, res){

    var isAdded = req.query.success;
    if(isAdded){
        isAdded = true;
    }else{
        isAdded = false;
    }

    res.render('add', {
        isAdded : isAdded
    });

});

//Get AddVendor
app.get('/addVendor', checkAuthenticated, function(req, res){

    var isAdded = req.query.success;
    if(isAdded){
        isAdded = true;
    }else{
        isAdded = false;
    }

    res.render('addVendor', {
        isAdded : isAdded
    });

});

app.get('/login', checkNotAuthenticated, function(req, res){
    res.render('login')
});

app.get('/register', checkNotAuthenticated, function(req, res){
    res.render('register')
});

app.post('/register', checkNotAuthenticated, async function(req, res){
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            type: req.body.type
        })
        console.log(users)
        res.redirect('/login')
    }catch(e){
        console.log(e)
        res.redirect('/register')
    }
});

app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        else {
            if(req.user.type==='Government'){
                console.log(req.user.type)
                return res.redirect('/');
            }
            else if(req.user.type==='School'){
                console.log(req.user.type)
                return  res.redirect('indexVendor');
            }
        }
      });
    })(req, res, next);
  });


app.get('/indexVendor', checkAuthenticated, function(req, res){
    session
        .run("MATCH (n: Vendor) RETURN n")
        .then(function(result){
            var vendorsArr = [];
            result.records.forEach(function(record){
                vendorsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
                //console.log(record._fields[0]);
            });

        res.render('indexVendor', {
            vendors: vendorsArr
        });    
            
        })
        .catch(function(error){
            console.log(error);
        });
});


//Add Government Route
app.post('/government/add', checkAuthenticated, function(req, res){
    var name = req.body.name;

    session
        .run("CREATE (n: Government{name: {nameParam}}) RETURN n.name",{nameParam: name})
        .then(function(result){
            res.redirect('/');
        })
        .catch(function(error){
            console.log(error);
        });
});

app.post('/school/add', checkAuthenticated, function(req, res){
    var name = req.body.name;

    session
        .run("CREATE (n: School{name: {nameParam}}) RETURN n.name",{nameParam: name})
        .then(function(result){
            res.redirect('/');
        })
        .catch(function(error){
            console.log(error);
        });
});

//Add vendor 
app.post('/vendor/add', checkAuthenticated, function(req, res){
    var name = req.body.name;

    session
        .run("CREATE (n: Vendor{name: {nameParam}}) RETURN n.name",{nameParam: name})
        .then(function(result){
            res.redirect('/addVendor');
        })
        .catch(function(error){
            console.log(error);
        });
});

//Allocate G to G
app.post('/allocate/gtog', checkAuthenticated, function(req, res){
    var name1 = req.body.name1;
    var name2 = req.body.name2;

    session
        .run("MATCH(a:Government{name:{nameParam1}}), (b:Government{name:{nameParam2}}) MERGE (a)-[r:FUND_ALLOCATED]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2})
        .then(function(result){
            res.redirect('/add?success=true');
        })
        .catch(function(error){
            console.log(error);
        });
});

//Allocate G to S
app.post('/allocate/gtos', checkAuthenticated, function(req, res){
    var name1 = req.body.name1;
    var name2 = req.body.name2;

    session
        .run("MATCH(a:Government{name:{nameParam1}}), (b:School{name:{nameParam2}}) MERGE (a)-[r:FUND_DISBURSED]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2})
        .then(function(result){
            res.redirect('/add?success=true');
        })
        .catch(function(error){
            console.log(error);
        });
});

//School to vendor 
app.post('/school/vendor', checkAuthenticated, function(req, res){
    var name1 = req.body.name1;
    var name2 = req.body.name2;

    session
        .run("MATCH(a:School{name:{nameParam1}}), (b:Vendor{name:{nameParam2}}) MERGE (a)-[r:FUND_DISBURSED]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2})
        .then(function(result){
            res.redirect('/add?success=true');
        })
        .catch(function(error){
            console.log(error);
        });
});

app.get('/graph', function(req, res){
    res.render('graph')
});


function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }

    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect('/')
    }

    next()
}

app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

app.listen(3000);

console.log('Server Started on port 3000');

module.exports = app;


