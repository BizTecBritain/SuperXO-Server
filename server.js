const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

var games = {};

const app = express();
const longpoll = require("express-longpoll")(app);
app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan("combined"));

longpoll.create("/get_move");
longpoll.create("/game_start");

app.get("/", (req, res) => {
  res.send(games);
});

app.get("/create_game/:id", (req, res) => {
  if (req.params.id in games) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: "Game already exists"
    });
  } else {
    var ids = [
      Math.floor(Math.random() * 100000000).toString(),
      Math.floor(Math.random() * 100000000).toString(),
    ];
    games[req.params.id] = { ids: ids, joined: 1, board: {}, xIsNext: true };
    console.log(ids);
    res.send(ids[0]);
  }
});

app.get("/join_game/:id", (req, res) => {
  if (!(req.params.id in games)) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: "Game doesn\'t exist"
    });
  } else if (games[req.params.id]["joined"] == 1) {
    games[req.params.id]["joined"] = 2;
    longpoll.publish("/game_start", {
      game: req.params.id,
    });
    res.send(games[req.params.id]["ids"][1]);
  } else {
    res.status(403).json({
      status: 'error',
      statusCode: 403,
      message: "Too many players"
    });
  }
});

app.post("/add_move/:id", (req, res) => {
  if (!(req.params.id in games)) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: "Game doesn\'t exist"
    });
  } else if (req.body.params.uid == games[req.params.id]["ids"][games[req.params.id]["xIsNext"] ? 0 : 1]) {
    games[req.params.id]["board"] = req.body.params.position;
    longpoll.publish("/get_move", {
      game: req.params.id,
      newMove: games[req.params.id]["board"],
      updateArea: req.body.params.updateArea,
      allowedBox: req.body.params.allowedBox
    });
    games[req.params.id]["xIsNext"] = !games[req.params.id]["xIsNext"];
    res.send("Success");
  } else {
    res.status(403).json({
      status: 'error',
      statusCode: 403,
      message: "Not your move!"
    });
  }
});

app.get("/get_moves/:id", (req, res) => {
  res.send(games[req.params.id]["board"]);
});

app.get("/reset", (req, res) => {
  games = {};
  res.send("Success");
});

app.listen(8080, () => {
  console.log("listening on port 8080");
});
