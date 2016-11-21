const firebase = require('firebase');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
// const events = require('events');

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
const flaresRef = ref.child('flares')

function listenForNotificationRequests() {
  const notifications = ref.child('notifications');
  notifications.on('child_added', (notificationSnapshot) => {
    var notification = notificationSnapshot.val();
    getFriendsFacebookIds(notification, function (ids, flareId) {
      notificationSnapshot.ref.remove()
      console.log(notification);
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
    if (ref.child('tokens').orderByKey().equalTo(id)) {
    const tokens = ref.child('tokens').orderByKey().equalTo(id);
    tokens.once('value', (tokenSnapshot) => {
      const token = tokenSnapshot.val()
          if (token) {
        callback(token[id].tokenId, flareId);
        }
      })
    }
  })
}

function getFlareSend(token, flareId) {
  var flareUid = flareId.replace('https://flare-1ef4b.firebaseio.com/flares/', '')
  const flares = ref.child('flares').orderByKey().equalTo(flareUid);
  flares.once('value', (flareSnapshot) => {
    const flare = flareSnapshot.val()[flareUid]
    sendNotificationToUser(
      token,
      flare.subtitle,
      flare.title,
      flareUid,
      () => { console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥'); }
    );
  })
}



function sendChatNotification() {
  flaresRef.on('child_added', (flareSnapshot) => {
    var flareRef = flareSnapshot.ref;
    flareRef.child("messages").on("child_added", (messageSnapshot) => {
      var flareID = flareSnapshot.key;
      convertFacebookIdsToTokens([flareSnapshot.val().facebookID], null, (token, flareID) => {
        // console.log("*******", flareOwnerToken);
        var messageText = messageSnapshot.val().text;
        var senderID = messageSnapshot.val().senderId;
        // console.log("****",token);


        // sendNotificationToUser(
        //   token,
        //   `New message`,
        //   messageText,
        //   flareID,
        //   () => { console.log("Chat notification sent"); }
        // );
      })


      // sendNotificationToUser(
      //   timToken,
      //   `New message`,
      //   messageText,
      //   flareID,
      //   () => { console.log("Chat notification sent"); }
      // );
    });
    // console.log(snapshot.parent().key());
  })
}

function sendNotificationToUser(token, title, message, flareUid, onSuccess) {
  console.log(`title: ${title}, message: "${message}"`);
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
        body: message,
        sound: 'ping.aiff',
        badge: 1
      },
      to: token,
      priority: 'high',
      content_available: true,
      data: {
        flare: flareUid
      }
    })
  }, (error, response, body) => {
    // console.log(body);
    if (error || (response.body && response.body.error)) {
      console.error(error);
    } else if (response.statusCode >= 400) {
      console.error(`HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
    } else {
      onSuccess();
    }
  });
}

function postScheduledFlares() {
  setInterval(function() {
    const scheduledFlaresRef = ref.child('scheduledFlares').orderByChild('startTimestamp').endAt((new Date).getTime())
    scheduledFlaresRef.once('value', (scheduledFlaresSnapshot) => {
      var scheduledFlare = scheduledFlaresSnapshot.val();
      for(i in scheduledFlare) { flaresRef.push(scheduledFlare[i]) }
    }, (error) => {
      console.error(error);
    });
  }, 60 * 1000); // 60 * 1000 milsec
}

function archiveExpiredFlares() {
  // setInterval(function() {
    var durationMilliseconds = 14400000

    ref.child('flareConstants').once('value', (snap) => {
      const duration = snap.val()['duration']
      var durationMilliseconds = duration * 60000
    });

    const archivedFlaresRef = ref.child('archivedFlares')

    var archiveTimestampLimit = (new Date).getTime() - durationMilliseconds

    flaresRef.orderByChild('timestamp').endAt(archiveTimestampLimit).once('value', (expiredFlaresSnapshot) => {
      expiredFlaresSnapshot.forEach(function(childSnap) {
        archivedFlaresRef.child(childSnap.key).set( childSnap.val(), function(err) {
          flaresRef.child(childSnap.key).remove();
          console.log("deleted the flare:", childSnap.key);
          // if( err ) { console.error(err); }
          // else { console.log("deleted the flare:", flareId); }
        });
    })
  })




    // var expiredFlares = expiredFlaresSnapshot.val()
    // for (var flareId in expiredFlares) {
    // // if (expiredFlares.hasOwnProperty(flareId)) {
    //   console.log("Key is " + flareId + ", value is" + expiredFlares[flareId]);
    //   archivedFlaresRef.child(flareId).set( expiredFlares[flareId], function(err) {
    //     console.log("deleted the flare:", flareId);
    //     // if( err ) { console.error(err); }
    //     // else { console.log("deleted the flare:", flareId); }
    //   });
    //   // flaresRef.child(flareId).remove();
    // // }

    // }, (error) => {
    //   console.error(error);
    // });
  // }, 60 * 1000); // 60 * 1000 milsec
}

//
// var emitter = new events.eventEmitter();

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


// start listening
// app.on('listening', () => {
  listenForNotificationRequests();
  // postScheduledFlares();
  archiveExpiredFlares();
  sendChatNotification();
// })
