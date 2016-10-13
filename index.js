const firebase = require('firebase');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser')

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY;

const config = {
  apiKey: FIREBASE_API_KEY,
  authDomain: 'flare-1ef4b.firebaseapp.com',
  databaseURL: 'https://flare-1ef4b.firebaseio.com/',
  storageBucket: 'flare-1ef4b.appspot.com',
};

firebase.initializeApp(config);
const ref = firebase.database().ref();

function listenForNotificationRequests() {
  const notifications = ref.child('notifications');
  notifications.on('child_added', (notificationSnapshot) => {
    const notification = notificationSnapshot.val();
    getFriendsFacebookIds(notification, function (ids, flareId) {
      notificationSnapshot.ref.remove()
      convertFacebookIdsToTokens(ids, flareId, function (token, flareId) {
        getFlareSend(token, flareId)
      })
    })
  }, (error) => {
    console.error(error);
  });
}

function getFriendsFacebookIds(notification, callback) {
  callback(notification.friendsFacebookIds, notification.flareId);
}

function convertFacebookIdsToTokens(friendsFacebookIds, flareId, callback) {
  friendsFacebookIds.forEach(id => {
    const tokens = ref.child('tokens');
    tokens.on('value', (tokenSnapshot) => {
      const token = tokenSnapshot.val()
      if (token[id]) {
        callback(token[id].tokenId, flareId);
      }
    })
  });
}

function getFlareSend(token, flareId) {
  const flareUid = flareId.replace('https://flare-1ef4b.firebaseio.com/flares/', '')
  const flares = ref.child('flares');

  flares.on('value', (flareSnapshot) => {
    const flare = flareSnapshot.val()
    sendNotificationToUser(
      token,
      flare[flareUid].subtitle,
      flare[flareUid].title, () => {
        console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
      }
    );
  })
}

function sendNotificationToUser(token, title, message, onSuccess) {
  console.log(`User ${title} created the message "${message}"`);
  request({
    url: 'https://fcm.googleapis.com/fcm/send',
    method: 'POST',
    headers: {
      'Content-Type' : 'application/json',
      'Authorization': `key=${FIREBASE_SERVER_KEY}`
    },
    body: JSON.stringify({
      notification: {
        title: title,
        body: message
      },
      to: token,
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
}

// start listening
listenForNotificationRequests();

const PORT = process.env.PORT || 3000;
const app = express();

const users = {};

app.use(bodyParser.json());

app.post('/token', (req, res) => {
  if (!req.body || !req.body.user || !req.body.token) {
    return res.sendStatus(400);
  }
  users[req.body.user] = req.body.token;
  res.send({});
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
