import "./App.css";
import "antd/dist/reset.css";
import "leaflet/dist/leaflet.css";
import "./Mobile.css";
import React, { useState, useRef } from "react";
import axios from "axios";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import {
  Input,
  Button,
  Typography,
  Spin,
  Row,
  Col,
  Form,
  Card,
  Select,
  Slider,
  List,
  Tag,
  ConfigProvider,
  theme,
  Divider,
} from "antd";
const { Title, Text } = Typography;
const { Option } = Select;


const schoolIcon = L.icon({
  iconUrl: "/school.png",
  iconSize: [40, 40], // w x h
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

const houseIcon = L.icon({
  iconUrl: "/home.png",
  iconSize: [30, 30], // w x h
  iconAnchor: [15, 40], //top left corner
  popupAnchor: [0, -40],
});

function MapCenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom()); // Maintain current zoom level
      map.invalidateSize(); // Ensure the map is resized properly
    }
  }, [center, map]);

  return null;
}

function SchoolCard({ school, schoolRefs, index, isSelected, onClick }) {
  return (
    <List.Item ref={(el) => (schoolRefs.current[index] = el)}>
      <Card
        onClick={onClick}
        hoverable
        style={{
          margin: "10px 0",
          border: isSelected == true ? "1px solid #1890ff" : "",
          borderRadius: "8px",
        }}
        styles={{Body: { paddingBottom: "10px" } }}>
        
        <div style={{ marginBottom: "10px" }}>
          <Title level={5}>{school.tags.name || "Unnamed School"}</Title>
          <Text>Distance: {school.distance.toFixed(2)} km</Text>

          <br />
          
          <Button
          type="link"
          href={`https://www.google.com/maps?q=${school.lat},${school.lon}`}
          target="_blank"
          style={{ padding: 0, paddingTop: 2 }}
        >
          Open in Google Maps
        </Button>
        <br />
        <div style={{ marginTop: "5px" }}>
          <Tag color="blue">{school.type}</Tag>
        </div>
        
        </div>
      </Card>
    </List.Item>
  );
}

function App() {
  const [address, setAddress] = useState("");
  const [schools, setSchools] = useState([]);
  const [center, setCenter] = useState([51.505, -0.09]); // maps default center, london
  const [userLocation, setUserLocation] = useState(null); // Track user location separately
  const [loading, setLoading] = useState(false);
  const [selectedSchoolIndex, setSelectedSchoolIndex] = useState(null); // Track selected school
  const [filters, setFilters] = useState({ type: "all",  maxDistance: 10 }); // 10 km default
  const schoolRefs = useRef({});
  const markerRefs = useRef([]); 

  const handleSearch = async () => {
    console.log("Selected Distance:", filters.maxDistance, " ", filters.type); // Check distance value
    setLoading(true);
    setSchools([]);

    try {
      // Step 1: Geocode the address
      const geocodeResponse = await axios.get("http://localhost:5000/geocode", {
        params: { address },
      });

      if (geocodeResponse.data.length === 0) {
        alert("Address not found!");
        setLoading(false);
        return;
      }

      const { lat, lon } = geocodeResponse.data[0]; // get geo data and set map
      setCenter([parseFloat(lat), parseFloat(lon)]); // set map location
      setUserLocation([parseFloat(lat), parseFloat(lon)]); // Set user location

      // Step 2: Find schools nearby
      const schoolsResponse = await axios.get("http://localhost:5000/schools", {
        params: {
          lat,
          lon,
          maxDistance: filters.maxDistance,
          type: filters.type,
        },
      });

      setSchools(
        schoolsResponse.data.filter((school) => {
          if (filters.type === "all") return true; // No filter if "all"
          return school.type === filters.type; // Use school.type (inferred type)
        })
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (changedValues) => {
    setFilters((prev) => ({ ...prev, ...changedValues }));
  };

  const scrollToSchool = (index) => {
    const ref = schoolRefs.current[index];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleCardClick = (index) => {
    setSelectedSchoolIndex(index);
    scrollToSchool(index);

    const selectedSchool = schools[index];
    setCenter([selectedSchool.lat, selectedSchool.lon]); // Update the map center to focus on school
  };

  const handlePopup = (index) => {
    const selectedMarker = markerRefs.current[index];
    if (selectedMarker) {
      selectedMarker.openPopup(); // Open the popup for the selected marker
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#121212",
        // padding: token.padding,
        // borderRadius: token.borderRadius,
        // color: token.colorPrimaryText,
        // fontSize: token.fontSize,
      }}
    >
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          components: {
            algorithm: true,
            Collapse: { algorithm: true },
            Button: {
              colorPrimary: "#575757",
              algorithm: true,
            },
            Input: { algorithm: true },
            Card: {
              algorithm: true,
              backgroundColor: "#333",
              colorText: "#fff",
            },
          },
        }}
      >
        <Card style={{ marginBottom: "20px" }}>
          <Title level={2}>Find Schools Near You</Title>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Input
                placeholder="Enter address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col span={1.5}>
              <Button
                type="primary"
                onClick={handleSearch}
                loading={loading}
                block
              >
                Search
              </Button>
            </Col>
          </Row>
        </Card>
        {loading ? (
          <Row justify="center" style={{ marginBottom: "20px" }}>
            <Spin tip="Loading..." />
          </Row>
        ) : (
          <Row gutter={16}>
            {/* Map Section */}
            <Col xs={24} md={16}>
              <Card
                styles={{ body: { padding: 0, height: "100%" } }}
                style={{ height: "300px" }} // Adjust for mobile
                >
                <MapContainer
                  center={center}
                  zoom={13}
                  style={{ height: "300px", width: "100%" }} // Ensure responsiveness
                  >
                  <MapCenter center={center} />
                  <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {userLocation && (
                    <Marker position={userLocation} icon={houseIcon} >
                      <Popup>You are here</Popup>
                      </Marker>
                  )}
                  {schools.map((school, index) => (
                    <Marker
                      key={index}
                      position={[school.lat, school.lon]}
                      icon={schoolIcon}
                      ref={(el) => (markerRefs.current[index] = el)} // Store reference to the marker
                      eventHandlers={{
                        click: () => {
                          handleCardClick(index); // Scroll to school on marker click
                        },
                      }}
                    >
                      <Popup>
                        <strong>{school.tags.name || "Unnamed School"}</strong>
                        <br />
                        Distance: {school.distance.toFixed(2)} km
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </Card>
            </Col>

            {/* Results Section */}
            <Col xs={24} md={8}>
              <Card style={{ height: "500px", overflowY: "auto" }}>
                <Title level={4}>Nearby Schools</Title>
                <Form
                  layout="vertical"
                  initialValues={filters}
                  onValuesChange={handleFilterChange}
                  style={{ marginBottom: "20px" }}
                >
                  <Form.Item label="School Type" name="type">
                    <Select>
                      <Option value="all">All</Option>
                      <Option value="Elementary/Primary School">
                        Elementary/Primary School
                      </Option>
                      <Option value="High School/Secondary School">
                        High School/Secondary School
                      </Option>
                      <Option value="College/University">
                        College/University
                      </Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="Maximum Distance (km)" name="maxDistance">
                    <Slider
                      min={1}
                      max={50}
                      marks={{
                        1: "1km",
                        10: "10km",
                        25: "25km",
                        50: "50km",
                      }}
                    />
                  </Form.Item>
                </Form>
                <Divider style={{marginBottom:"0px"}} />
                <List
                  //style={{ margin: "5px", paddingTop: "0px" }}
                  dataSource={schools}
                  renderItem={(school, index) => (
                    <SchoolCard
                      school={school}
                      schoolRefs={schoolRefs}
                      index={index}
                      isSelected={selectedSchoolIndex === index} // Apply selection style
                      onClick={() => {
                        handleCardClick(index);
                        handlePopup(index); // Show the popup for the marker
                      }} // Scroll to school on card click
                    />
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </ConfigProvider>
    </div>
  );
}

export default App;
