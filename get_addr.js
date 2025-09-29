// Install axios first: npm install axios
const axios = require("axios");

async function getLatLng(address) {
  const apiKey = "YOUR_API_KEY"; // replace with your Google Maps API key
  const url = `https://maps.googleapis.com/maps/api/geocode/json`;

  try {
    const response = await axios.get(url, {
      params: {
        address: address,
        key: apiKey
      }
    });

    if (response.data.status === "OK") {
      const location = response.data.results[0].geometry.location;
      console.log("Latitude:", location.lat);
      console.log("Longitude:", location.lng);
      return location;
    } else {
      console.error("Geocoding failed:", response.data.status);
      return null;
    }
  } catch (err) {
    console.error("Error:", err.message);
    return null;
  }
}

// Example usage
getLatLng("New Delhi, India");
