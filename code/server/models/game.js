'use strict';

const
  userlogic = require("./logic/user"),
  gamelogic = require("./logic/game");

function create(req, res) {
  //create game
  gamelogic.create(req.body.name, req.body.size)
    .then(function (gameCreated) {
      //create user
      if (gameCreated.status == "ok") {
        userlogic.create(req.body.name, gameCreated.gameToken, "owner")
          .then(function (userCreated) {
            if (userCreated.status == "ok") {
              let response = { status: "ok", code: 0, message: "ok" };
              Object.assign(response, gameCreated);
              response.accessToken = userCreated.data.accessToken;
              response.refreshToken = userCreated.data.refreshToken;
              res.json(response);
            } else {
              res.json(userCreated);
            }
          });
      } else {
        res.json(gameCreated);
      }
    });
};

function list(req, res) {
  gamelogic.list()
    .then(function (content) {
      let response = { status: "ok", code: 0, message: "ok" };
      Object.assign(response, content);
      res.json(response);
      removeOutdated();
    });
};

function join(req, res) {
  // find game and check if opponent's place empty
  gamelogic.join(req.body.gameToken, req.body.name)
    .then(function (joined) {
      if (joined.status == "ok") {
        // if joined - create user tokens for this game
        userlogic.create(req.body.name, req.body.gameToken, "opponent")
          .then(function (userCreated) {
            let response = { status: "ok", code: 0, message: "ok" };
            if (userCreated.status == "ok") {
              response.accessToken = userCreated.data.accessToken;
              response.refreshToken = userCreated.data.refreshToken;
              res.json(response);
            } else {
              res.json(userCreated);
            }
          });
      } else {
        res.json(joined);
      }
    }
    );
};

function step(req, res) {
  let row = parseInt(req.body.row);
  let col = parseInt(req.body.col);
  if (Number.isInteger(row) && Number.isInteger(col)) {
    userlogic.checkUser(req.get("accessToken"), req.body.name)
      .then(function (userChecked) {
        if (userChecked.status == "ok") {
          gamelogic.step(userChecked.gameToken, userChecked.role, row, col)
            .then(function (stepResponse) {
              let response = { status: "ok", code: 0, message: "ok" };
              Object.assign(response, stepResponse);
              res.json(response);
            });
        } else {
          res.json(userChecked);
        }
      });
  } else {
    res.json({ status: "error", code: 50, message: "Wrong row or col" });
  }
};

function state(req, res) {
  userlogic.checkUser(req.get("accessToken"), req.get("name"))
    .then(function (userChecked) {
      if (userChecked.status == "ok") {
        gamelogic.state(userChecked.gameToken, userChecked.role)
          .then(function (state) {
            let response = { status: "ok", code: 0, message: "ok" };
            Object.assign(response, state);
            res.json(response);
            removeOutdated();
          });
      } else {
        gamelogic.state(req.get("gameToken"), "view")
          .then(function (state) {
            let response = { status: "ok", code: 0, message: "ok" };
            Object.assign(response, state);
            res.json(response);
            removeOutdated();
          });
      }
    });
};

function removeOutdated() {
  //outdated games removing runs after getting games list or any game status
  gamelogic.getOutdated()
    .then(function (gettingOutdated) {
      if (gettingOutdated.status == "ok" && gettingOutdated.gameTokenArray.length > 0) {
        userlogic.remove(gettingOutdated.gameTokenArray)
          .then(function (removedOutdated) {
            if (removedOutdated.status == "ok") {
              gamelogic.removeOutdated(gettingOutdated.gameTokenArray);
              //result of removing is not showing to users
            }
          })
      }
    });
};

module.exports = {
  create: create,
  list: list,
  join: join,
  step: step,
  state: state
};