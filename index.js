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

function listenForNotificationRequests() {
  const notifications = ref.child('notifications');
  notifications.on('child_added', (notificationSnapshot) => {
    const notification = notificationSnapshot.val();
    // console.log(notification.friendsFacebookIds);
      convertFacebookIdsToTokens(notification.friendsFacebookIds)
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
  }, (error) => {
    console.error(error);
  });
}

function convertFacebookIdsToTokens(friendsFacebookIds) {
  console.log(friendsFacebookIds);
  friendsFacebookIds.forEach(id => {
    const tokens = ref.child('tokens');
    tokens.on('value', (tokenSnapshot) => {
      // console.log(tokenSnapshot.val());
      const token = tokenSnapshot.val()
      // console.log(token[id].tokenID);
      friendsTokensArray.push(token[id].tokenID);
      // console.log(friendsTokensArray);
    })
  });
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
          to: "djZle4-WuPo:APA91bFEk6rSIKktD-LUBwN0ii-pTb9DGAN87a90kc6tRMvz59--pivjpq3BvyfUc_wiksPbHEUEAoAdfHqeS6jpLpBof5CS-b0wK47jRQ1KNvRNykfq42avGv1JhkjxflJYoIS8_LjB",
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
