var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');

var app = express();

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "123456"))
var session = driver.session()

//Home Route
app.get('/', function(req, res){
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
app.get('/add',function(req, res){

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

//Add Government Route
app.post('/government/add', function(req, res){
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

app.post('/school/add', function(req, res){
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


//Allocate G to G
app.post('/allocate/gtog', function(req, res){
    var name1 = req.body.name1;
    var name2 = req.body.name2;

    session
        .run("MATCH(a:Government{name:{nameParam1}}), (b:Government{name:{nameParam2}}) MERGE (a)-[r:FUND_ALLOCATED]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2})
        .then(function(result){
            res.redirect('/?success=true');
        })
        .catch(function(error){
            console.log(error);
        });
});

//Allocate G to S
app.post('/allocate/gtos', function(req, res){
    var name1 = req.body.name1;
    var name2 = req.body.name2;

    session
        .run("MATCH(a:Government{name:{nameParam1}}), (b:School{name:{nameParam2}}) MERGE (a)-[r:FUND_DISBURSED]->(b) RETURN a,b ",{nameParam1: name1, nameParam2: name2})
        .then(function(result){
            res.redirect('/?success=true');
        })
        .catch(function(error){
            console.log(error);
        });
});

app.get('/graph', function(req, res){
    res.render('graph')
});





app.listen(3000);

console.log('Server Started on port 3000');

module.exports = app;


