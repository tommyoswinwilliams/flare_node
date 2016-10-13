const firebase = require('firebase');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser')

const API_KEY = process.env.FIREBASE_API_KEY;

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: 'flare-1ef4b.firebaseapp.com',
  databaseURL: 'https://flare-1ef4b.firebaseio.com/',
  storageBucket: 'flare-1ef4b.appspot.com',
};

firebase.initializeApp(config);
const ref = firebase.database().ref();

var friendsTokensArray = [];
// var friendsFacebookIdsArray = [];
var friendsFacebookIdsArrayTest = ['10154479520857387',  '10157474917765252',  '10153684774890666',  '10154522964878397',  '10155322526784782']

function listenForNotificationRequests() {
  const notifications = ref.child('notifications');
  notifications.on('child_added', (notificationSnapshot) => {
    const notification = notificationSnapshot.val();
    console.log("listenForNotificationRequests");
    console.log(notification.friendsFacebookIds);
    getFriendsFacebookIds(notification, function (ids) {
      convertFacebookIdsToTokens(ids, function (tokens) {
        eachSendNotificationToUser(tokens)
      })
    })
  }, (error) => {
    console.error(error);
  });
}

function getFriendsFacebookIds(notification, callback) {
    console.log("getFriendsFacebookIds");
    console.log(notification.friendsFacebookIds);
    callback(notification.friendsFacebookIds)
}

function convertFacebookIdsToTokens(friendsFacebookIds, callback) {
  console.log("convertFacebookIdsToTokens");
  console.log(friendsFacebookIds);
  friendsFacebookIds.forEach(id => {
    const tokens = ref.child('tokens');
    tokens.on('value', (tokenSnapshot) => {
      const token = tokenSnapshot.val()
      friendsTokensArray.push(token[id].tokenId);
      console.log(friendsTokensArray);
    })
  });
  console.log(friendsTokensArray);
  callback(friendsTokensArray)
}

function eachSendNotificationToUser(friendsTokensArray) {
  // console.log("eachSendNotificationToUser");
  // console.log(friendsTokensArray);
  friendsTokensArray.forEach(token => {
    sendNotificationToUser(
      token,
      notification.subtitle,
      notification.title,
      () => {
        // requestSnapshot.ref.remove();
      }
    );
  })
}


function sendNotificationToUser(username, title, message, onSuccess) {
  console.log(`User ${username} created the message "${message}"`);
  // Object.keys(users).forEach(user => {
  //   if (user !== username) {
      console.log(`Sending notification to user Tim`);
      request({
        url: 'https://fcm.googleapis.com/fcm/send',
        method: 'POST',
        headers: {
          'Content-Type' : 'application/json',
          'Authorization': `key=${API_KEY}`
        },
        body: JSON.stringify({
          notification: {
            title: title,
            body: message
          },
          to: username,
          priority: 'high',
          content_available: true
        })
      }, (error, response, body) => {
        console.log(body);
        if (error || (response.body && response.body.error)) {
          console.error(error);
        } else if (response.statusCode >= 400) {
          console.error(`HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
        } else {
          onSuccess();
        }
      });
    // }
  // });
}

// start listening
listenForNotificationRequests();

const PORT = 3000;
const app = express();

const users = {};

app.use(bodyParser.json());

app.post('/token', (req, res) => {
  if (!req.body || !req.body.user || !req.body.token) {
    return res.sendStatus(400);
  }
  users[req.body.user] = req.body.token;
  console.log(users);
  res.send({});
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
