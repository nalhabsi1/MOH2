# Health Data Visualization

This project provides an interactive map visualization of healthcare facilities in Oman using GeoJSON data.

## Features

- Interactive map showing healthcare facilities across Oman
- Multiple facility types: Hospitals, Health Centers, Clinics, Pharmacies, etc.
- Filtering by facility type and governorate
- Click on facilities to see detailed information
- Responsive design with modern UI

## Data Sources

The visualization uses the following data files:
- `Hospital Locations.geojson` - Hospital locations
- `Health Centers.geojson` - Health center locations  
- `Health Complex.geojson` - Health complex locations
- `Clinic.geojson` - Clinic locations
- `Diagnostic Center.geojson` - Diagnostic center locations
- `Pharmacies.geojson` - Pharmacy locations
- `Blood Banks.geojson` - Blood bank locations
- `Hospital Location Zone.geojson` - Hospital service zones
- Various CSV files with additional statistics

## How to Run

### Option 1: Using Python Server (Recommended)

1. Make sure you have Python 3.6+ installed
2. Open a terminal/command prompt in this directory
3. Run: `python server.py`
4. The server will start at `http://localhost:8000`
5. Your browser will open automatically to the visualization

### Option 2: Using Windows Batch File

1. Double-click `start_server.bat`
2. The server will start and open in your browser

### Option 3: Manual Server Start

If you have Python installed, you can also run:
```bash
python -m http.server 8000
```

Then open `http://localhost:8000/index.html` in your browser.

## Why Use a Local Server?

Opening the HTML file directly in a browser will cause CORS (Cross-Origin Resource Sharing) errors because browsers block local file access for security reasons. Using a local server solves this issue.

## Troubleshooting

### Map is Empty
- Check the browser console for error messages
- Ensure all data files are in the `data/` folder
- Verify the server is running on the correct port

### Data Not Loading
- Check that file names match exactly (case-sensitive)
- Ensure GeoJSON files have valid structure
- Look for network errors in browser developer tools

### Server Won't Start
- Check if port 8000 is already in use
- Ensure Python is installed and in your PATH
- Try a different port by editing `server.py`

## Browser Compatibility

This visualization works best in modern browsers:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Data Format

The GeoJSON files should follow the standard format:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      },
      "properties": {
        "name": "Facility Name",
        "address": "Facility Address"
      }
    }
  ]
}
```

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all data files are present and valid
3. Ensure the local server is running correctly
4. Check that file paths and names match exactly
