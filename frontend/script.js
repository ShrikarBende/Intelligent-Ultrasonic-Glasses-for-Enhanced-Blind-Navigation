// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXJiw5UsgoD1bc64eBUaHf_X41tA934v0",
  authDomain: "blindglasses-cf714.firebaseapp.com",
  databaseURL: "https://blindglasses-cf714-default-rtdb.firebaseio.com",
  projectId: "blindglasses-cf714",
  storageBucket: "blindglasses-cf714.appspot.com",
  messagingSenderId: "408490695617",
  appId: "1:408490695617:web:e31ef0a40152c925ceed40"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Application State
let map = L.map("map").setView([18.5204, 73.8567], 13);
let currentMarker = null;
let watchId = null;
let currentInstruction = "";
let lastInstruction = "";
let instructionInterval = null;
let testMode = false;
let testEndCoords = null;
const userId = "example-user-123";

// Map Setup
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Voice Synthesis Setup
const synth = window.speechSynthesis;
let voicesReady = false;

// Initialize voices
synth.onvoiceschanged = () => {
  voicesReady = true;
  console.log("Voices available:", synth.getVoices());
};

// Enhanced Test Mode Handler
function enableTestMode() {
  const lat = parseFloat(document.getElementById('testLat').value);
  const lng = parseFloat(document.getElementById('testLng').value);
  
  if (!isNaN(lat) && !isNaN(lng)) {
    testMode = true;
    testEndCoords = { lat, lng };
    
    // Immediately update Firebase with test destination
    db.ref(`users/${userId}/location/end`).set(testEndCoords)
      .then(() => {
        alert(`Test destination set to: ${lat}, ${lng}`);
        // Automatically start navigation
        startTracking();
      })
      .catch(error => {
        console.error("Firebase update error:", error);
        alert('Failed to set test destination');
      });
  } else {
    alert('Invalid coordinates');
  }
}

// Enhanced Voice Instruction System
function speakInstruction(text) {
  if (!text) return;

  // Handle Chrome's audio autoplay policy
  if (window.AudioContext) {
    const audioContext = new AudioContext();
    audioContext.resume().catch(console.error);
  }

  if (synth.speaking) synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = 1;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const voices = synth.getVoices();
  if (voices.length > 0) {
    utterance.voice = voices.find(v => v.lang === 'en-IN') || 
                      voices.find(v => v.lang === 'en-US') || 
                      voices[0];
  }

  synth.speak(utterance);
  console.log("Speaking instruction:", text);
}

// Instruction Monitor with 4-second polling
function monitorInstruction() {
  if (instructionInterval) clearInterval(instructionInterval);

  instructionInterval = setInterval(async () => {
    try {
      const snapshot = await db.ref(`users/${userId}/instructions`).get();
      if (snapshot.exists()) {
        const instructions = snapshot.val();
        const newInstruction = instructions.current_instruction;

        if (newInstruction) {
          document.getElementById("currentInstruction").textContent = newInstruction;
          
          if (newInstruction !== currentInstruction) {
            currentInstruction = newInstruction;
            speakInstruction(newInstruction);
          }
          lastInstruction = newInstruction;
        }
      }
    } catch (error) {
      console.error("Instruction error:", error);
    }
  }, 4000);
}

// Voice Button Handler
function startVoiceReading() {
  if (lastInstruction) {
    speakInstruction(lastInstruction);
  } else {
    speakInstruction("No instructions available yet");
  }
}

// Geocoding Service
async function geocode(location) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    );
    const data = await response.json();
    return data[0] ? { lat: +data[0].lat, lng: +data[0].lon } : null;
  } catch (error) {
    console.error("Geocoding error:", error);
    alert(`Error finding ${location}: ${error.message}`);
    return null;
  }
}

// Enhanced Tracking Function
async function startTracking() {
  try {
    // Cleanup previous session
    if (instructionInterval) clearInterval(instructionInterval);
    if (watchId) navigator.geolocation.clearWatch(watchId);
    if (currentMarker) map.removeLayer(currentMarker);

    // Show loading status
    document.getElementById("currentInstruction").textContent = "🔄 Initializing navigation...";
    
    let startCoords;
    
    // Get real-time start location only if not in test mode
    if (!testMode) {
      const startPos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000
        });
      });
      startCoords = {
        lat: startPos.coords.latitude,
        lng: startPos.coords.longitude
      };
    } else {
      // Use default start coordinates for testing
      startCoords = { lat: 18.5204, lng: 73.8567 };
    }

    // Get end location
    let endCoords = testMode ? testEndCoords : await geocode(document.getElementById("endLocation").value);
    
    if (!endCoords) throw new Error("Invalid end location");

    // Update Firebase
    await db.ref(`users/${userId}/location`).update({
      start: startCoords,
      end: endCoords,
      current: startCoords
    });

    // Update Map
    map.setView(startCoords, 14);
    L.marker(startCoords)
      .addTo(map)
      .bindPopup(testMode ? "Test Start Position" : "Current Position")
      .openPopup();
      
    L.marker(endCoords)
      .addTo(map)
      .bindPopup(testMode ? "Test Destination" : "Destination");

    // Real-time GPS Updates
    watchId = navigator.geolocation.watchPosition(
      position => {
        const currentCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Update Firebase and map
        db.ref(`users/${userId}/location/current`).set(currentCoords);
        if (currentMarker) map.removeLayer(currentMarker);
        currentMarker = L.marker([currentCoords.lat, currentCoords.lng])
          .addTo(map)
          .bindPopup("Current Position")
          .openPopup();
      },
      error => {
        console.error("Geolocation error:", error);
        alert(`Location error: ${error.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    // Start instruction monitoring
    monitorInstruction();

  } catch (error) {
    console.error("Tracking error:", error);
    alert(error.message);
  }
}