# Drivers Lounge Navigation v4

This release adds:
- Interactive OpenStreetMap/Leaflet map
- Browser GPS geolocation
- Origin/destination geocoding
- Live road route geometry through the public OSRM demo service
- Toggleable parking, fuel, scale, weather, restriction and repair layers
- Route distance, estimated drive time and arrival calculation
- Truck-profile advisory risk scoring
- Ahead-of-route intelligence cards
- AI-style route recommendation logic
- Mobile-responsive navigation workspace

## Important production limitation
The public OSRM route is a general road route, not a certified truck-routing engine.
Truck dimensions, hazmat and oversize settings produce advisory risk warnings only.
For certified commercial routing, connect a licensed truck-routing provider such as
Trimble Maps, HERE Truck Routing, TomTom Truck Routing, or Mapbox with a commercial vehicle data partner.

Always obey official restrictions, permits and posted signage.
