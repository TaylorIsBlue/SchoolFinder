const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
//const geolib = require("geolib");
const cors = require('cors');
const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(cors());

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const OVERPASS_BASE_URL = "https://overpass-api.de/api/interpreter";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const R = 6378; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const inferSchoolType = (name) => {
    if (!name) return "unknown"; // If no name, return unknown
    const nameLower = name.toLowerCase();

    if (nameLower.includes("elementary") || nameLower.includes("primary")) {
        return "Elementary/Primary School";
    } else if (nameLower.includes("high school") || nameLower.includes("secondary")) {
        return "High School/Secondary School";
    } else if (nameLower.includes("university") || nameLower.includes("college")) {
        return "College/University";
    }

    return "unknown"; // Default to unknown if no matches
};

// Geocode an address using Nominatim
app.get("/geocode", async (req, res) => {
    const address = req.query.address;
    try {
        const response = await axios.get(
            `${NOMINATIM_BASE_URL}/search`,
            {
                params: {
                    q: address,
                    format: "json",
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching geocode:", error);
        res.status(500).json({ error: "Error fetching geocode" });
    }
});


// Find schools near a specific location using Overpass API
app.get("/schools", async (req, res) => {
    const { lat, lon, maxDistance = 10, type = "all" } = req.query; // Defaults: 10 km, all types
    const radius = maxDistance * 1000; // Convert km to meters

    if (!lat || !lon) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    let query = `
            [out:json];
            node["amenity"="school"](around:${radius},${lat},${lon});
            out;
    `;
    try {
        
        const response = await axios.post(`${OVERPASS_BASE_URL}`, query);

        let schools = response.data.elements.map((school) => {
            const distance = calculateDistance(lat, lon, school.lat, school.lon);
            const schoolType = inferSchoolType(school.tags.name);

            return {
                ...school,
                distance,
                type: schoolType, // Inferred type
            };
        });
        if (type && type !== "all") {
            schools = schools.filter((school) => school.type === type);
        }

        schools.sort((a, b) => a.distance - b.distance);

        res.json(schools);
    } catch (error) {
        console.error("Error fetching schools:", error);
        res.status(500).json({ error: "Error fetching schools" });
    }
});


app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
});
