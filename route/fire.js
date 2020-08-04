var firebase = require('firebase')

var config = {
    apiKey: "AIzaSyAdPa2Q3EYlcULOVzXLZeqU_UQjsZoeY_8",
    authDomain: "vvstudio-4a753.firebaseapp.com",
    databaseURL: "https://vvstudio-4a753.firebaseio.com",
    projectId: "vvstudio-4a753",
    storageBucket: "vvstudio-4a753.appspot.com",
    messagingSenderId: "387797601816",
    appId: "1:387797601816:web:6477bd83f19c887dbdbd6d",
    measurementId: "G-8SEKTNMJTH"
};

var fire = firebase.initializeApp(config);
module.exports = fire